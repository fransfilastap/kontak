package http

import (
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

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
func (h *InboxHandler) GetThreads(c echo.Context) error {
	clientID := c.Param("client_id")
	limit, _ := strconv.ParseInt(c.QueryParam("limit"), 10, 64)
	offset, _ := strconv.ParseInt(c.QueryParam("offset"), 10, 64)

	if limit <= 0 {
		limit = 50
	}

	threads, err := h.db.GetThreads(c.Request().Context(), db.GetThreadsParams{
		DeviceID:    clientID,
		QueryLimit:  limit,
		QueryOffset: offset,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	if threads == nil {
		threads = []db.GetThreadsRow{}
	}

	return c.JSON(http.StatusOK, threads)
}

// GetThreadMessages returns the messages for a specific thread (identified by chat_jid).
func (h *InboxHandler) GetThreadMessages(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := decodeChatJID(c)
	limit, _ := strconv.ParseInt(c.QueryParam("limit"), 10, 64)
	offset, _ := strconv.ParseInt(c.QueryParam("offset"), 10, 64)

	if limit <= 0 {
		limit = 50
	}

	messages, err := h.db.GetThreadMessages(c.Request().Context(), db.GetThreadMessagesParams{
		DeviceID:  pgtype.Text{String: clientID, Valid: true},
		Recipient: chatJID,
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	if messages == nil {
		messages = []db.GetThreadMessagesRow{}
	}

	return c.JSON(http.StatusOK, messages)
}

// SendMessage sends a text message within an existing thread.
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
