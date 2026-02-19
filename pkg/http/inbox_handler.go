package http

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/fransfilastap/kontak/pkg/db"
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

type SendInboxMessageRequest struct {
	Text string `json:"text" validate:"required"`
}

type SendNewMessageRequest struct {
	To   string `json:"to" validate:"required"`
	Text string `json:"text" validate:"required"`
}

func (h *InboxHandler) GetConversations(c echo.Context) error {
	clientID := c.Param("client_id")
	limit, _ := strconv.ParseInt(c.QueryParam("limit"), 10, 64)
	offset, _ := strconv.ParseInt(c.QueryParam("offset"), 10, 64)

	if limit <= 0 {
		limit = 50
	}

	conversations, err := h.db.GetConversations(c.Request().Context(), db.GetConversationsParams{
		DeviceID:    pgtype.Text{String: clientID, Valid: true},
		QueryLimit:  pgtype.Int8{Int64: limit, Valid: true},
		QueryOffset: pgtype.Int8{Int64: offset, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	if conversations == nil {
		conversations = []db.GetConversationsRow{}
	}

	return c.JSON(http.StatusOK, conversations)
}

func (h *InboxHandler) GetMessages(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := c.Param("chat_jid")
	limit, _ := strconv.ParseInt(c.QueryParam("limit"), 10, 64)
	offset, _ := strconv.ParseInt(c.QueryParam("offset"), 10, 64)

	if limit <= 0 {
		limit = 50
	}

	messages, err := h.db.GetConversationMessages(c.Request().Context(), db.GetConversationMessagesParams{
		DeviceID:  pgtype.Text{String: clientID, Valid: true},
		Recipient: chatJID,
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	if messages == nil {
		messages = []db.GetConversationMessagesRow{}
	}

	return c.JSON(http.StatusOK, messages)
}

func (h *InboxHandler) SendMessage(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := c.Param("chat_jid")

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

	// Determine recipient type
	recipientType := "individual"
	if len(chatJID) > 0 && chatJID[len(chatJID)-5:] == "@g.us" {
		recipientType = "group"
	}

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

	return c.JSON(http.StatusOK, msg)
}

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

	recipientType := "individual"
	if len(req.To) > 5 && req.To[len(req.To)-5:] == "@g.us" {
		recipientType = "group"
	}

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

	return c.JSON(http.StatusOK, msg)
}

func (h *InboxHandler) MarkRead(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := c.Param("chat_jid")

	err := h.db.MarkConversationRead(c.Request().Context(), db.MarkConversationReadParams{
		DeviceID:  pgtype.Text{String: clientID, Valid: true},
		Recipient: chatJID,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, GenericResponse{Message: "Conversation marked as read"})
}

func (h *InboxHandler) SendMediaMessage(c echo.Context) error {
	clientID := c.Param("client_id")
	chatJID := c.Param("chat_jid")

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
	waMessageID, err := h.waClient.SendMediaMessage(clientID, chatJID, fileBytes, fileHeader.Filename, contentType)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	// Determine recipient type
	recipientType := "individual"
	if len(chatJID) > 0 && chatJID[len(chatJID)-5:] == "@g.us" {
		recipientType = "group"
	}

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
		WaMessageID:   pgtype.Text{String: waMessageID, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, msg)
}
