package http

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

type InboxHandler struct {
	db          db.Querier
	waClient    *wa.WhatsappClient
	deviceStore *wa.DeviceStore
}

func NewInboxHandler(dbQuerier db.Querier, waClient *wa.WhatsappClient, deviceStore *wa.DeviceStore) *InboxHandler {
	return &InboxHandler{
		db:          dbQuerier,
		waClient:    waClient,
		deviceStore: deviceStore,
	}
}

// decodeChatJID URL-decodes the chat_jid path parameter (e.g. "62859106509617%40s.whatsapp.net" → "62859106509617@s.whatsapp.net")
func decodeChatJID(c echo.Context) string {
	raw := c.Param("chat_jid")
	decoded, err := url.PathUnescape(raw)
	if err != nil {
		return raw
	}
	return decoded
}

func recipientTypeFromJID(jid string) string {
	if strings.HasSuffix(jid, "@g.us") {
		return "group"
	}
	return "individual"
}

type SendInboxMessageRequest struct {
	Text string `json:"text" validate:"required"`
}

type SendNewMessageRequest struct {
	To   string `json:"to" validate:"required"`
	Text string `json:"text" validate:"required"`
}

// GetThreads returns the list of message threads for a device.
// @Summary List threads
// @Description Get all message threads for a device
// @Tags inbox
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {array} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Router /admin/inbox/{client_id}/threads [get]
// @Security BearerAuth
func (h *InboxHandler) GetThreads(c echo.Context) error {
	clientID := c.Param("client_id")
	limit, _ := strconv.ParseInt(c.QueryParam("limit"), 10, 64)
	offset, _ := strconv.ParseInt(c.QueryParam("offset"), 10, 64)

	if limit <= 0 {
		limit = 50
	}

	userID := getUserIDFromContext(c)
	logger.Info("GetThreads: clientID=%s userID=%d", clientID, userID)

	ctx, cancel := context.WithTimeout(c.Request().Context(), 10*time.Second)
	defer cancel()

	device, err := h.deviceStore.GetDeviceByIDAndUserID(ctx, clientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		logger.Error("Device not found: clientID=%s userID=%d error=%v", clientID, userID, err)
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			logger.Error("Context deadline exceeded getting device: clientID=%s userID=%d", clientID, userID)
			return c.JSON(http.StatusRequestTimeout, ErrorResponse{Error: "Request timeout"})
		}
		logger.Error("Error fetching device: clientID=%s userID=%d error=%v", clientID, userID, err)
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}
	logger.Info("Device found: id=%s user_id=%v", device.ID, device.UserID)

	threads, err := h.db.GetThreads(ctx, db.GetThreadsParams{
		DeviceID:    clientID,
		QueryLimit:  int32(limit),
		QueryOffset: int32(offset),
	})
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			logger.Error("Context deadline exceeded fetching threads: clientID=%s", clientID)
			return c.JSON(http.StatusRequestTimeout, ErrorResponse{Error: "Request timeout"})
		}
		logger.Error("Error fetching threads: clientID=%s error=%v", clientID, err)
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	if threads == nil {
		threads = []db.GetThreadsRow{}
	}

	return c.JSON(http.StatusOK, threads)
}

// GetThreadMessages returns the messages for a specific thread (identified by chat_jid).
// @Summary List thread messages
// @Description Get messages for a specific thread
// @Tags inbox
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Param chat_jid path string true "Chat JID"
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {array} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Router /admin/inbox/{client_id}/threads/{chat_jid}/messages [get]
// @Security BearerAuth
func (h *InboxHandler) GetThreadMessages(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := decodeChatJID(c)
	limit, _ := strconv.ParseInt(c.QueryParam("limit"), 10, 64)
	offset, _ := strconv.ParseInt(c.QueryParam("offset"), 10, 64)

	if limit <= 0 {
		limit = 50
	}

	userID := getUserIDFromContext(c)
	ctx, cancel := context.WithTimeout(c.Request().Context(), 10*time.Second)
	defer cancel()

	_, err := h.deviceStore.GetDeviceByIDAndUserID(ctx, clientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return c.JSON(http.StatusRequestTimeout, ErrorResponse{Error: "Request timeout"})
		}
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	messages, err := h.db.GetThreadMessages(ctx, db.GetThreadMessagesParams{
		DeviceID:  pgtype.Text{String: clientID, Valid: true},
		Recipient: chatJID,
		Limit:     int32(limit),
		Offset:    int32(offset),
	})
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return c.JSON(http.StatusRequestTimeout, ErrorResponse{Error: "Request timeout"})
		}
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	if messages == nil {
		messages = []db.GetThreadMessagesRow{}
	}

	return c.JSON(http.StatusOK, messages)
}

// SendMessage sends a text message within an existing thread.
// @Summary Send message to thread
// @Description Send a text message to an existing thread
// @Tags inbox
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Param chat_jid path string true "Chat JID"
// @Param request body SendInboxMessageRequest true "Message data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/inbox/{client_id}/threads/{chat_jid}/send [post]
// @Security BearerAuth
func (h *InboxHandler) SendMessage(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := decodeChatJID(c)

	var req SendInboxMessageRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	waMessageID, err := h.waClient.SendMessage(clientID, chatJID, req.Text)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	recipientType := recipientTypeFromJID(chatJID)

	msg, err := h.db.LogOutgoingMessage(c.Request().Context(), db.LogOutgoingMessageParams{
		DeviceID:      pgtype.Text{String: clientID, Valid: true},
		Recipient:     chatJID,
		RecipientType: pgtype.Text{String: recipientType, Valid: true},
		MessageType:   pgtype.Text{String: "text", Valid: true},
		Content:       req.Text,
		WaMessageID:   pgtype.Text{String: waMessageID, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	// Update thread
	_ = h.db.UpsertThread(c.Request().Context(), db.UpsertThreadParams{
		DeviceID:    clientID,
		ChatJid:     chatJID,
		ChatType:    recipientType,
		Content:     req.Text,
		MessageType: "text",
		Direction:   "outgoing",
		IsIncoming:  false,
	})

	return c.JSON(http.StatusOK, msg)
}

// SendNewMessage sends a text message to a new recipient (creates thread if needed).
// @Summary Send new message
// @Description Send a text message to a new recipient (creates thread if needed)
// @Tags inbox
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Param request body SendNewMessageRequest true "Message data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/inbox/{client_id}/threads/send [post]
// @Security BearerAuth
func (h *InboxHandler) SendNewMessage(c echo.Context) error {
	clientID := c.Param("client_id")

	var req SendNewMessageRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	waMessageID, err := h.waClient.SendMessage(clientID, req.To, req.Text)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	recipientType := recipientTypeFromJID(req.To)

	msg, err := h.db.LogOutgoingMessage(c.Request().Context(), db.LogOutgoingMessageParams{
		DeviceID:      pgtype.Text{String: clientID, Valid: true},
		Recipient:     req.To,
		RecipientType: pgtype.Text{String: recipientType, Valid: true},
		MessageType:   pgtype.Text{String: "text", Valid: true},
		Content:       req.Text,
		WaMessageID:   pgtype.Text{String: waMessageID, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	// Upsert thread for the new conversation
	_ = h.db.UpsertThread(c.Request().Context(), db.UpsertThreadParams{
		DeviceID:    clientID,
		ChatJid:     req.To,
		ChatType:    recipientType,
		Content:     req.Text,
		MessageType: "text",
		Direction:   "outgoing",
		IsIncoming:  false,
	})

	return c.JSON(http.StatusOK, msg)
}

// MarkRead marks all incoming messages in a thread as read and resets unread count.
// @Summary Mark thread as read
// @Description Mark all messages in a thread as read
// @Tags inbox
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Param chat_jid path string true "Chat JID"
// @Success 200 {object} GenericResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/inbox/{client_id}/threads/{chat_jid}/read [post]
// @Security BearerAuth
func (h *InboxHandler) MarkRead(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := decodeChatJID(c)

	err := h.db.MarkConversationRead(c.Request().Context(), db.MarkConversationReadParams{
		DeviceID:  pgtype.Text{String: clientID, Valid: true},
		Recipient: chatJID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	// Reset thread unread count
	_ = h.db.ResetThreadUnread(c.Request().Context(), db.ResetThreadUnreadParams{
		DeviceID: clientID,
		ChatJid:  chatJID,
	})

	return c.JSON(http.StatusOK, GenericResponse{Message: "Conversation marked as read"})
}

// SendMediaMessage sends a media file within an existing thread.
// @Summary Send media message
// @Description Send a media file (image, video, audio, document) to an existing thread
// @Tags inbox
// @Accept multipart/form-data
// @Produce json
// @Param client_id path string true "Device ID"
// @Param chat_jid path string true "Chat JID"
// @Param file formData file true "Media file"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/inbox/{client_id}/threads/{chat_jid}/media [post]
// @Security BearerAuth
func (h *InboxHandler) SendMediaMessage(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := decodeChatJID(c)

	err := c.Request().ParseMultipartForm(16 << 20) // 16MB
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Failed to parse multipart form")
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "File is required")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	contentType := fileHeader.Header.Get("Content-Type")
	logger.Info("Sending media message: client=%s chat=%s file=%s type=%s size=%d",
		clientID, chatJID, fileHeader.Filename, contentType, fileHeader.Size)

	waMessageID, err := h.waClient.SendMediaMessage(clientID, chatJID, fileBytes, fileHeader.Filename, contentType)
	if err != nil {
		logger.Error("Failed to send media message: client=%s chat=%s error=%v", clientID, chatJID, err)
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	recipientType := recipientTypeFromJID(chatJID)

	// Determine message type based on content type
	messageType := "document"
	if strings.HasPrefix(contentType, "image/") {
		messageType = "image"
	} else if strings.HasPrefix(contentType, "video/") {
		messageType = "video"
	} else if strings.HasPrefix(contentType, "audio/") {
		messageType = "audio"
	}

	msg, err := h.db.LogOutgoingMessage(c.Request().Context(), db.LogOutgoingMessageParams{
		DeviceID:      pgtype.Text{String: clientID, Valid: true},
		Recipient:     chatJID,
		RecipientType: pgtype.Text{String: recipientType, Valid: true},
		Content:       fileHeader.Filename,
		MessageType:   pgtype.Text{String: messageType, Valid: true},
		Column6:       fileHeader.Filename,
		Column7:       fileHeader.Filename,
		WaMessageID:   pgtype.Text{String: waMessageID, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	// Update thread
	_ = h.db.UpsertThread(c.Request().Context(), db.UpsertThreadParams{
		DeviceID:    clientID,
		ChatJid:     chatJID,
		ChatType:    recipientType,
		Content:     fileHeader.Filename,
		MessageType: messageType,
		Direction:   "outgoing",
		IsIncoming:  false,
	})

	return c.JSON(http.StatusOK, msg)
}

type ScheduleMessageRequest struct {
	To          string `json:"to" validate:"required"`
	Text        string `json:"text" validate:"required"`
	ScheduledAt string `json:"scheduled_at" validate:"required"`
}

// ScheduleMessage creates a delayed singleton broadcast job
// @Summary Schedule message
// @Description Schedule a message to be sent at a specific time
// @Tags inbox
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Param request body ScheduleMessageRequest true "Message data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/inbox/{client_id}/schedule [post]
// @Security BearerAuth
func (h *InboxHandler) ScheduleMessage(c echo.Context) error {
	clientID := c.Param("client_id")
	userID := getUserIDFromContext(c)

	var req ScheduleMessageRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	t, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid scheduled_at format, must be RFC3339"})
	}

	job, err := h.db.CreateBroadcastJob(c.Request().Context(), db.CreateBroadcastJobParams{
		UserID:      pgtype.Int4{Int32: userID, Valid: true},
		DeviceID:    pgtype.Text{String: clientID, Valid: true},
		Name:        "Scheduled Message for " + req.To,
		MessageType: pgtype.Text{String: "text", Valid: true},
		Content:     req.Text,
		IsScheduled: true,
		ScheduledAt: pgtype.Timestamptz{Time: t, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	err = h.db.CreateBroadcastRecipient(c.Request().Context(), db.CreateBroadcastRecipientParams{
		JobID:        job.ID,
		RecipientJid: req.To,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusCreated, job)
}
