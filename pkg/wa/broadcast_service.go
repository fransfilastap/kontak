package wa

import (
	"context"
	"time"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/jackc/pgx/v5/pgtype"
)

type BroadcastService struct {
	db       db.Querier
	waClient *WhatsappClient
}

func NewBroadcastService(db db.Querier, waClient *WhatsappClient) *BroadcastService {
	return &BroadcastService{
		db:       db,
		waClient: waClient,
	}
}

func (s *BroadcastService) Start(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.processPendingJobs(ctx)
		}
	}
}

func (s *BroadcastService) processPendingJobs(ctx context.Context) {
	jobs, err := s.db.GetPendingBroadcastJobs(ctx)
	if err != nil {
		logger.Error("Failed to get pending broadcast jobs: %v", err)
		return
	}

	for _, job := range jobs {
		s.processJob(ctx, job)
	}
}

func (s *BroadcastService) processJob(ctx context.Context, job db.BroadcastJob) {
	logger.Info("Processing broadcast job: %s (%s)", job.Name, job.ID.String())

	// Update job status to processing
	err := s.db.UpdateBroadcastJobStatus(ctx, db.UpdateBroadcastJobStatusParams{
		ID:     job.ID,
		Status: pgtype.Text{String: "processing", Valid: true},
	})
	if err != nil {
		logger.Error("Failed to update job status to processing: %v", err)
		return
	}

	recipients, err := s.db.GetPendingRecipients(ctx, job.ID)
	if err != nil {
		logger.Error("Failed to get pending recipients for job %s: %v", job.ID.String(), err)
		return
	}

	for _, recipient := range recipients {
		// Check if context is cancelled
		select {
		case <-ctx.Done():
			return
		default:
		}

		logger.Info("Sending broadcast to recipient: %s", recipient.RecipientJid)

		err := s.sendBroadcastMessage(job, recipient.RecipientJid)
		status := "sent"
		errMsg := ""
		if err != nil {
			status = "failed"
			errMsg = err.Error()
			logger.Error("Failed to send broadcast message to %s: %v", recipient.RecipientJid, err)
		} else {
			logger.Info("Successfully sent broadcast to %s", recipient.RecipientJid)
		}

		err = s.db.UpdateBroadcastRecipientStatus(ctx, db.UpdateBroadcastRecipientStatusParams{
			JobID:        job.ID,
			RecipientJid: recipient.RecipientJid,
			Status:       pgtype.Text{String: status, Valid: true},
			ErrorMessage: pgtype.Text{String: errMsg, Valid: errMsg != ""},
		})
		if err != nil {
			logger.Error("Failed to update recipient status: %v", err)
		}

		// Wait between each recipient to avoid rate limiting and protocol issues
		time.Sleep(2 * time.Second)

		// Cooldown (additional delay if specified)
		if job.Cooldown.Valid && job.Cooldown.Int32 > 0 {
			time.Sleep(time.Duration(job.Cooldown.Int32) * time.Second)
		}
	}

	// Update job status to completed
	err = s.db.UpdateBroadcastJobStatus(ctx, db.UpdateBroadcastJobStatusParams{
		ID:     job.ID,
		Status: pgtype.Text{String: "completed", Valid: true},
	})
	if err != nil {
		logger.Error("Failed to update job status to completed: %v", err)
	}
}

func (s *BroadcastService) sendBroadcastMessage(job db.BroadcastJob, recipientJid string) error {
	if !s.waClient.IsConnected(job.DeviceID.String) {
		return context.DeadlineExceeded // Or a more appropriate error
	}

	waMessageID, err := s.waClient.SendMessage(job.DeviceID.String, recipientJid, job.Content)

	if err == nil {
		recipientType := "individual"
		if len(recipientJid) > 5 && recipientJid[len(recipientJid)-5:] == "@g.us" {
			recipientType = "group"
		}

		ctx := context.Background()
		_, logErr := s.db.LogOutgoingMessage(ctx, db.LogOutgoingMessageParams{
			DeviceID:      job.DeviceID,
			Recipient:     recipientJid,
			RecipientType: pgtype.Text{String: recipientType, Valid: true},
			MessageType:   job.MessageType,
			Content:       job.Content,
			WaMessageID:   pgtype.Text{String: waMessageID, Valid: true},
		})
		if logErr != nil {
			logger.Error("Failed to log outgoing broadcast message: %v", logErr)
		}

		_ = s.db.UpsertThread(ctx, db.UpsertThreadParams{
			DeviceID:    job.DeviceID.String,
			ChatJid:     recipientJid,
			ChatType:    recipientType,
			Content:     job.Content,
			MessageType: job.MessageType.String,
			Direction:   "outgoing",
			IsIncoming:  false,
		})
	}

	return err
}
