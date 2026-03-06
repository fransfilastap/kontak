package http

import (
	"errors"
	"net/http"
	"time"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

type BroadcastHandler struct {
	db          db.Querier
	deviceStore *wa.DeviceStore
}

func NewBroadcastHandler(db db.Querier, deviceStore *wa.DeviceStore) *BroadcastHandler {
	return &BroadcastHandler{db: db, deviceStore: deviceStore}
}

type CreateBroadcastRequest struct {
	DeviceID    string   `json:"device_id" validate:"required"`
	Name        string   `json:"name" validate:"required"`
	Content     string   `json:"content" validate:"required"`
	MessageType string   `json:"message_type" validate:"required"`
	Cooldown    int32    `json:"cooldown"`
	Recipients  []string `json:"recipients" validate:"required"`
	ScheduledAt string   `json:"scheduled_at"`
}

// CreateBroadcast creates a new broadcast job
// @Summary Create broadcast
// @Description Create a new broadcast job to send messages to multiple recipients
// @Tags broadcasts
// @Accept json
// @Produce json
// @Param request body CreateBroadcastRequest true "Broadcast data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/broadcasts [post]
// @Security BearerAuth
func (h *BroadcastHandler) CreateBroadcast(c echo.Context) error {
	var req CreateBroadcastRequest
	if err := c.Bind(&req); err != nil {
		logger.Error("CreateBroadcast: bind error=%v", err)
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	userID := getUserIDFromContext(c)
	logger.Info("CreateBroadcast: userID=%d deviceID=%s", userID, req.DeviceID)

	if userID == 0 {
		logger.Error("CreateBroadcast: unauthorized userID=0")
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}

	// Verify device ownership
	_, err := h.deviceStore.GetDeviceByIDAndUserID(c.Request().Context(), req.DeviceID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		logger.Error("CreateBroadcast: device not found deviceID=%s userID=%d", req.DeviceID, userID)
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Device not found"})
	}
	if err != nil {
		logger.Error("CreateBroadcast: error checking device ownership deviceID=%s userID=%d error=%v", req.DeviceID, userID, err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	var isScheduled bool
	var scheduledAt pgtype.Timestamptz
	if req.ScheduledAt != "" {
		t, err := time.Parse(time.RFC3339, req.ScheduledAt)
		if err == nil {
			isScheduled = true
			scheduledAt = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}

	job, err := h.db.CreateBroadcastJob(c.Request().Context(), db.CreateBroadcastJobParams{
		UserID:      pgtype.Int4{Int32: userID, Valid: true},
		DeviceID:    pgtype.Text{String: req.DeviceID, Valid: true},
		Name:        req.Name,
		MessageType: pgtype.Text{String: req.MessageType, Valid: true},
		Content:     req.Content,
		Cooldown:    pgtype.Int4{Int32: req.Cooldown, Valid: true},
		IsScheduled: isScheduled,
		ScheduledAt: scheduledAt,
	})
	if err != nil {
		logger.Error("CreateBroadcast: failed to create job error=%v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	for _, recipientJid := range req.Recipients {
		err = h.db.CreateBroadcastRecipient(c.Request().Context(), db.CreateBroadcastRecipientParams{
			JobID:        job.ID,
			RecipientJid: recipientJid,
		})
		if err != nil {
			logger.Error("CreateBroadcast: failed to add recipient %s error=%v", recipientJid, err)
		}
	}

	logger.Info("CreateBroadcast: success jobID=%s", job.ID)
	return c.JSON(http.StatusCreated, job)
}

// GetBroadcastJobs returns all broadcast jobs for the authenticated user
// @Summary List broadcasts
// @Description Get all broadcast jobs for the authenticated user
// @Tags broadcasts
// @Accept json
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Router /admin/broadcasts [get]
// @Security BearerAuth
func (h *BroadcastHandler) GetBroadcastJobs(c echo.Context) error {
	userID := getUserIDFromContext(c)
	logger.Info("GetBroadcastJobs: userID=%d", userID)

	if userID == 0 {
		logger.Error("GetBroadcastJobs: unauthorized userID=0")
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}
	jobs, err := h.db.GetBroadcastJobs(c.Request().Context(), pgtype.Int4{Int32: userID, Valid: true})
	if err != nil {
		logger.Error("GetBroadcastJobs: error=%v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	logger.Info("GetBroadcastJobs: found %d jobs", len(jobs))
	return c.JSON(http.StatusOK, jobs)
}

// GetBroadcastJob returns a specific broadcast job with its recipients
// @Summary Get broadcast
// @Description Get a specific broadcast job with its recipients
// @Tags broadcasts
// @Accept json
// @Produce json
// @Param id path string true "Broadcast Job ID"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/broadcasts/{id} [get]
// @Security BearerAuth
func (h *BroadcastHandler) GetBroadcastJob(c echo.Context) error {
	userID := getUserIDFromContext(c)
	logger.Info("GetBroadcastJob: userID=%d", userID)

	if userID == 0 {
		logger.Error("GetBroadcastJob: unauthorized userID=0")
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		logger.Error("GetBroadcastJob: invalid id=%s error=%v", idStr, err)
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid id"})
	}

	job, err := h.db.GetBroadcastJob(c.Request().Context(), db.GetBroadcastJobParams{
		ID:     pgtype.UUID{Bytes: id, Valid: true},
		UserID: pgtype.Int4{Int32: userID, Valid: true},
	})
	if err != nil {
		logger.Error("GetBroadcastJob: job not found id=%s error=%v", idStr, err)
		return c.JSON(http.StatusNotFound, echo.Map{"error": "job not found"})
	}

	recipients, err := h.db.GetBroadcastRecipients(c.Request().Context(), job.ID)
	if err != nil {
		logger.Error("GetBroadcastJob: error fetching recipients jobID=%s error=%v", job.ID, err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, echo.Map{
		"job":        job,
		"recipients": recipients,
	})
}
