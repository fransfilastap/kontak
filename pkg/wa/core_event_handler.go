package wa

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/jackc/pgx/v5/pgtype"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

type EventHandler struct {
	client            *WhatsappClient
	store             Store
	db                db.Querier
	clientID          string
	subscriptionStore *SubscriptionStore
}

func BuildEventHandler(clientID string, client *WhatsappClient, store Store, dbQuerier db.Querier, subscriptionStore *SubscriptionStore) *EventHandler {
	return &EventHandler{
		clientID:          clientID,
		client:            client,
		store:             store,
		db:                dbQuerier,
		subscriptionStore: subscriptionStore,
	}
}

func (w *EventHandler) handle(rawEvt interface{}) {
	eventType := w.getEventType(rawEvt)
	if eventType != "" && !w.subscriptionStore.IsEnabled(w.clientID, eventType) {
		return
	}

	switch evt := rawEvt.(type) {
	case *events.AppStateSyncComplete:
		w.handleAppStateSyncComplete(evt)
	case *events.Connected, *events.PushNameSetting:
		w.handleConnection(evt)
	case *events.PairSuccess:
		w.handlePairSuccess(evt)
	case *events.PairError:
		logger.Info("PairError: %v", evt)
	case *events.QRScannedWithoutMultidevice:
		logger.Info("QR scanned without multidevice")
	case *events.StreamReplaced:
		logger.Info("Received StreamReplaced event")
		return
	case *events.ManualLoginReconnect:
		logger.Info("ManualLoginReconnect")
	case *events.TemporaryBan:
		logger.Info("TemporaryBan: %v", evt)
	case *events.ConnectFailure:
		logger.Info("ConnectFailure: %v", evt)
	case *events.ClientOutdated:
		logger.Info("ClientOutdated")
	case *events.CATRefreshError:
		logger.Info("CATRefreshError: %v", evt)
	case *events.StreamError:
		logger.Info("StreamError: %v", evt)
	case *events.AppState:
		logger.Debug("AppState: %v", evt)
	case *events.KeepAliveTimeout:
		logger.Debug("KeepAliveTimeout: %v", evt)
	case *events.KeepAliveRestored:
		logger.Debug("KeepAliveRestored")
	case *events.LoggedOut:
		w.handleLoggedOut(evt)
	case *events.Disconnected:
		w.setConnectionStatus(false)
	case *events.Message:
		w.handleIncomingMessage(evt)
	case *events.FBMessage:
		logger.Debug("FBMessage: %v", evt)
	case *events.Receipt:
		w.handleReceipt(evt)
	case *events.ChatPresence:
		w.handleChatPresence(evt)
	case *events.Presence:
		w.handlePresence(evt)
	case *events.JoinedGroup:
		w.handleJoinedGroup(evt)
	case *events.GroupInfo:
		w.handleGroupInfo(evt)
	case *events.Picture:
		w.handlePicture(evt)
	case *events.UserAbout:
		w.handleUserAbout(evt)
	case *events.IdentityChange:
		w.handleIdentityChange(evt)
	case *events.HistorySync:
		logger.Info("HistorySync: %v", evt)
	case *events.UndecryptableMessage:
		logger.Debug("UndecryptableMessage: %v", evt)
	case *events.MediaRetry:
		logger.Debug("MediaRetry: %v", evt)
	case *events.OfflineSyncPreview:
		logger.Debug("OfflineSyncPreview: %v", evt)
	case *events.OfflineSyncCompleted:
		logger.Debug("OfflineSyncCompleted: %v", evt)
	case *events.Blocklist:
		logger.Debug("Blocklist: %v", evt)
	case *events.PrivacySettings:
		logger.Debug("PrivacySettings: %v", evt)
	case *events.NewsletterJoin:
		logger.Debug("NewsletterJoin: %v", evt)
	case *events.NewsletterLeave:
		logger.Debug("NewsletterLeave: %v", evt)
	case *events.NewsletterLiveUpdate:
		logger.Debug("NewsletterLiveUpdate: %v", evt)
	default:
		logger.Debug("Unknown event type: %T", rawEvt)
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

	var downloadMessage whatsmeow.DownloadableMessage
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
		mediaFilename = "image.jpg"
		downloadMessage = img
	case evt.Message.GetVideoMessage() != nil:
		vid := evt.Message.GetVideoMessage()
		text = vid.GetCaption()
		messageType = "video"
		mediaFilename = "video.mp4"
		downloadMessage = vid
	case evt.Message.GetDocumentMessage() != nil:
		doc := evt.Message.GetDocumentMessage()
		text = doc.GetTitle()
		messageType = "document"
		mediaFilename = doc.GetFileName()
		if mediaFilename == "" {
			mediaFilename = "document"
		}
		downloadMessage = doc
	case evt.Message.GetAudioMessage() != nil:
		messageType = "audio"
		mediaFilename = "audio.ogg"
		downloadMessage = evt.Message.GetAudioMessage()
	default:
		return
	}

	if downloadMessage != nil {
		data, err := w.client.runningClients[w.clientID].Download(context.Background(), downloadMessage)
		if err == nil && len(data) > 0 {
			// Save media locally
			if err := os.MkdirAll("uploads", os.ModePerm); err == nil {
				// generate safe unique filename
				uniqueFilename := fmt.Sprintf("%s-%s", evt.Info.ID, strings.ReplaceAll(mediaFilename, " ", "_"))
				filePath := filepath.Join("uploads", uniqueFilename)
				if err := os.WriteFile(filePath, data, 0644); err == nil { // Fixed: using io/ioutil instead of os for older go versions, but standard since go1.16 is os.WriteFile. Ensure imports
					// Store the local API route
					mediaURL = fmt.Sprintf("/api/media/%s", uniqueFilename)
				} else {
					logger.Error("Failed to save downloaded media %s: %v", uniqueFilename, err)
				}
			} else {
				logger.Error("Failed to create uploads directory: %v", err)
			}
		} else {
			logger.Error("Failed to download media for message %s: %v", evt.Info.ID, err)
		}
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

func (w *EventHandler) getEventType(rawEvt interface{}) string {
	switch rawEvt.(type) {
	case *events.AppStateSyncComplete:
		return "app_state_sync_complete"
	case *events.Connected:
		return "connected"
	case *events.PushNameSetting:
		return "push_name_setting"
	case *events.PairSuccess:
		return "pair_success"
	case *events.PairError:
		return "pair_error"
	case *events.QRScannedWithoutMultidevice:
		return "qr_scanned_without_multidevice"
	case *events.StreamReplaced:
		return "stream_replaced"
	case *events.ManualLoginReconnect:
		return "manual_login_reconnect"
	case *events.TemporaryBan:
		return "temp_ban"
	case *events.ConnectFailure:
		return "connect_failure"
	case *events.ClientOutdated:
		return "client_outdated"
	case *events.CATRefreshError:
		return "cat_refresh_error"
	case *events.StreamError:
		return "stream_error"
	case *events.AppState:
		return "app_state"
	case *events.KeepAliveTimeout:
		return "keep_alive_timeout"
	case *events.KeepAliveRestored:
		return "keep_alive_restored"
	case *events.LoggedOut:
		return "logged_out"
	case *events.Disconnected:
		return "disconnected"
	case *events.Message:
		return "message"
	case *events.FBMessage:
		return "fb_message"
	case *events.Receipt:
		return "receipt"
	case *events.ChatPresence:
		return "chat_presence"
	case *events.Presence:
		return "presence"
	case *events.JoinedGroup:
		return "joined_group"
	case *events.GroupInfo:
		return "group_info"
	case *events.Picture:
		return "picture"
	case *events.UserAbout:
		return "user_about"
	case *events.IdentityChange:
		return "identity_change"
	case *events.HistorySync:
		return "history_sync"
	case *events.UndecryptableMessage:
		return "undecryptable_message"
	case *events.MediaRetry:
		return "media_retry"
	case *events.OfflineSyncPreview:
		return "offline_sync_preview"
	case *events.OfflineSyncCompleted:
		return "offline_sync_completed"
	case *events.Blocklist:
		return "blocklist"
	case *events.PrivacySettings:
		return "privacy_settings"
	case *events.NewsletterJoin:
		return "newsletter_join"
	case *events.NewsletterLeave:
		return "newsletter_leave"
	case *events.NewsletterLiveUpdate:
		return "newsletter_live_update"
	case *events.QR:
		return "qr"
	default:
		return ""
	}
}

func (w *EventHandler) handleChatPresence(evt *events.ChatPresence) {
	logger.Debug("ChatPresence: %v", evt)
}

func (w *EventHandler) handlePresence(evt *events.Presence) {
	logger.Debug("Presence: %v", evt)
}

func (w *EventHandler) handleJoinedGroup(evt *events.JoinedGroup) {
	logger.Info("JoinedGroup: %v", evt)
}

func (w *EventHandler) handleGroupInfo(evt *events.GroupInfo) {
	logger.Debug("GroupInfo: %v", evt)
}

func (w *EventHandler) handlePicture(evt *events.Picture) {
	logger.Info("Picture changed: %v", evt)
}

func (w *EventHandler) handleUserAbout(evt *events.UserAbout) {
	logger.Info("UserAbout changed: %v", evt)
}

func (w *EventHandler) handleIdentityChange(evt *events.IdentityChange) {
	logger.Info("IdentityChange: %v", evt)
}
