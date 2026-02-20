package wa

import (
	"context"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/jackc/pgx/v5/pgtype"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

type EventHandler struct {
	client   *WhatsappClient
	store    Store
	db       db.Querier
	clientID string
}

func BuildEventHandler(clientID string, client *WhatsappClient, store Store, dbQuerier db.Querier) *EventHandler {
	return &EventHandler{
		clientID: clientID,
		client:   client,
		store:    store,
		db:       dbQuerier,
	}
}

func (w *EventHandler) handle(rawEvt interface{}) {
	switch evt := rawEvt.(type) {
	case *events.AppStateSyncComplete:
		w.handleAppStateSyncComplete(evt)
	case *events.Connected, *events.PushNameSetting:
		w.handleConnection(evt)
	case *events.PairSuccess:
		w.handlePairSuccess(evt)
	case *events.StreamReplaced:
		logger.Info("Received StreamReplaced event")
		return
	case *events.AppState:
		logger.Debug("AppState: %v", evt)
	case *events.LoggedOut:
		w.handleLoggedOut(evt)
	case *events.Disconnected:
		w.setConnectionStatus(false)
	case *events.Message:
		w.handleIncomingMessage(evt)
	case *events.Receipt:
		w.handleReceipt(evt)
	}
}

func (w *EventHandler) handleAppStateSyncComplete(evt *events.AppStateSyncComplete) {
	if len(w.client.RetrieveDevice(w.clientID).Store.PushName) > 0 && evt.Name == appstate.WAPatchCriticalBlock {
		w.sendPresence()
	}
	w.setConnectionStatus(true)
}

func (w *EventHandler) handleConnection(evt interface{}) {
	if len(w.client.RetrieveDevice(w.clientID).Store.PushName) == 0 {
		return
	}
	w.sendPresence()
	w.setConnectionStatus(true)
}

func (w *EventHandler) handlePairSuccess(evt *events.PairSuccess) {
	logger.Info("Pairing successful")
	jid := evt.ID
	w.setClientJID(jid.String())
	w.setConnectionStatus(true)
}

func (w *EventHandler) handleLoggedOut(evt *events.LoggedOut) {
	logger.Info("Reason for logout: %v", evt.Reason)
	_, err := w.client.DisconnectDevice(w.clientID)
	if err != nil {
		return
	}
	w.setConnectionStatus(false)
}

func (w *EventHandler) handleIncomingMessage(evt *events.Message) {
	// Extract content and determine message type
	var text string
	var messageType string
	var mediaURL string
	var mediaFilename string

	switch {
	case evt.Message.GetConversation() != "":
		text = evt.Message.GetConversation()
		messageType = "text"
	case evt.Message.GetExtendedTextMessage() != nil:
		text = evt.Message.GetExtendedTextMessage().GetText()
		messageType = "text"
	case evt.Message.GetImageMessage() != nil:
		img := evt.Message.GetImageMessage()
		text = img.GetCaption()
		messageType = "image"
		mediaURL = img.GetURL()
		mediaFilename = "image"
	case evt.Message.GetVideoMessage() != nil:
		vid := evt.Message.GetVideoMessage()
		text = vid.GetCaption()
		messageType = "video"
		mediaURL = vid.GetURL()
		mediaFilename = "video"
	case evt.Message.GetDocumentMessage() != nil:
		doc := evt.Message.GetDocumentMessage()
		text = doc.GetTitle()
		messageType = "document"
		mediaURL = doc.GetURL()
		mediaFilename = doc.GetFileName()
	case evt.Message.GetAudioMessage() != nil:
		messageType = "audio"
		mediaURL = evt.Message.GetAudioMessage().GetURL()
		mediaFilename = "audio"
	default:
		return
	}

	chatJID := evt.Info.Chat.String()
	recipientType := "individual"
	if evt.Info.IsGroup {
		recipientType = "group"
	}

	direction := "incoming"
	if evt.Info.IsFromMe {
		direction = "outgoing"
	}

	// Upsert the thread
	threadContent := text
	if threadContent == "" && messageType != "text" {
		threadContent = messageType
	}
	if err := w.db.UpsertThread(context.Background(), db.UpsertThreadParams{
		DeviceID:    w.clientID,
		ChatJid:     chatJID,
		ChatType:    recipientType,
		Content:     threadContent,
		MessageType: messageType,
		Direction:   direction,
		IsIncoming:  !evt.Info.IsFromMe,
	}); err != nil {
		logger.Error("Failed to upsert thread for chat %s: %v", chatJID, err)
	}

	// Messages sent from the primary device (phone) — log as outgoing
	if evt.Info.IsFromMe {
		_, err := w.db.LogOutgoingMessage(context.Background(), db.LogOutgoingMessageParams{
			DeviceID:      pgtype.Text{String: w.clientID, Valid: true},
			Recipient:     chatJID,
			RecipientType: pgtype.Text{String: recipientType, Valid: true},
			MessageType:   pgtype.Text{String: messageType, Valid: true},
			Content:       text,
			Column6:       mediaURL,
			Column7:       mediaFilename,
			WaMessageID:   pgtype.Text{String: evt.Info.ID, Valid: true},
		})
		if err != nil {
			logger.Error("Failed to log synced outgoing message: %v", err)
		} else {
			logger.Debug("Logged synced outgoing %s message in chat %s", messageType, chatJID)
		}
		return
	}

	senderJID := evt.Info.Sender.String()

	_, err := w.db.LogIncomingMessage(context.Background(), db.LogIncomingMessageParams{
		DeviceID:      pgtype.Text{String: w.clientID, Valid: true},
		Recipient:     chatJID,
		RecipientType: pgtype.Text{String: recipientType, Valid: true},
		MessageType:   pgtype.Text{String: messageType, Valid: true},
		Content:       text,
		Column6:       mediaURL,
		Column7:       mediaFilename,
		SenderJid:     pgtype.Text{String: senderJID, Valid: true},
		WaMessageID:   pgtype.Text{String: evt.Info.ID, Valid: true},
	})
	if err != nil {
		logger.Error("Failed to log incoming message: %v", err)
	} else {
		logger.Debug("Logged incoming %s message from %s in chat %s", messageType, senderJID, chatJID)
	}
}

func (w *EventHandler) handleReceipt(evt *events.Receipt) {
	var status string
	switch evt.Type {
	case types.ReceiptTypeDelivered:
		status = "delivered"
	case types.ReceiptTypeRead:
		status = "read"
	default:
		return
	}

	for _, msgID := range evt.MessageIDs {
		err := w.db.UpdateMessageStatus(context.Background(), db.UpdateMessageStatusParams{
			WaMessageID: pgtype.Text{String: msgID, Valid: true},
			Status:      pgtype.Text{String: status, Valid: true},
		})
		if err != nil {
			logger.Error("Failed to update message status for %s: %v", msgID, err)
		}
	}
}

func (w *EventHandler) sendPresence() {
	err := w.client.RetrieveDevice(w.clientID).SendPresence(context.Background(), types.PresenceAvailable)
	if err != nil {
		logger.Error("Failed to send available presence: %v", err)
	} else {
		logger.Info("Marked self as available")
	}
}

func (w *EventHandler) setConnectionStatus(isConnected bool) {
	err := w.store.SetConnectionStatus(context.Background(), w.clientID, isConnected)
	if err != nil {
		logger.Error("Failed to set connection status to %v: %v", isConnected, err)
	}
}

func (w *EventHandler) setClientJID(jid string) {
	err := w.store.SetClientJID(context.Background(), w.clientID, jid)
	if err != nil {
		logger.Error("Failed to set client jid: %v", err)
	}
}
