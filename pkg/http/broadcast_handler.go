package http

import (
	"net/http"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

type BroadcastHandler struct {
	db db.Querier
}

func NewBroadcastHandler(db db.Querier) *BroadcastHandler {
	return &BroadcastHandler{db: db}
}

type CreateBroadcastRequest struct {
	DeviceID    string   `json:"device_id" validate:"required"`
	Name        string   `json:"name" validate:"required"`
	Content     string   `json:"content" validate:"required"`
	MessageType string   `json:"message_type" validate:"required"`
	Cooldown    int32    `json:"cooldown"`
	Recipients  []string `json:"recipients" validate:"required"`
}

func (h *BroadcastHandler) CreateBroadcast(c echo.Context) error {
	var req CreateBroadcastRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}
	job, err := h.db.CreateBroadcastJob(c.Request().Context(), db.CreateBroadcastJobParams{
		UserID:      pgtype.Int4{Int32: userID, Valid: true},
		DeviceID:    pgtype.Text{String: req.DeviceID, Valid: true},
		Name:        req.Name,
		MessageType: pgtype.Text{String: req.MessageType, Valid: true},
		Content:     req.Content,
		Cooldown:    pgtype.Int4{Int32: req.Cooldown, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	for _, recipientJid := range req.Recipients {
		err = h.db.CreateBroadcastRecipient(c.Request().Context(), db.CreateBroadcastRecipientParams{
			JobID:        job.ID,
			RecipientJid: recipientJid,
		})
		if err != nil {
			// Log error but continue
		}
	}

	return c.JSON(http.StatusCreated, job)
}

func (h *BroadcastHandler) GetBroadcastJobs(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}
	jobs, err := h.db.GetBroadcastJobs(c.Request().Context(), pgtype.Int4{Int32: userID, Valid: true})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, jobs)
}

func (h *BroadcastHandler) GetBroadcastJob(c echo.Context) error {
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid id"})
	}

	job, err := h.db.GetBroadcastJob(c.Request().Context(), db.GetBroadcastJobParams{
		ID:     pgtype.UUID{Bytes: id, Valid: true},
		UserID: pgtype.Int4{Int32: userID, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "job not found"})
	}

	recipients, err := h.db.GetBroadcastRecipients(c.Request().Context(), job.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, echo.Map{
		"job":        job,
		"recipients": recipients,
	})
}
