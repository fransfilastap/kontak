package wa

import (
	"context"

	"github.com/fransfilastap/kontak/pkg/logger"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

type EventHandler struct {
	client   *WhatsappClient
	store    Store
	clientID string
}

func BuildEventHandler(clientID string, client *WhatsappClient, store Store) *EventHandler {
	return &EventHandler{
		clientID: clientID,
		client:   client,
		store:    store,
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
	w.client.DisconnectDevice(w.clientID)
	w.setConnectionStatus(false)
}

func (w *EventHandler) sendPresence() {
	err := w.client.RetrieveDevice(w.clientID).SendPresence(types.PresenceAvailable)
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
