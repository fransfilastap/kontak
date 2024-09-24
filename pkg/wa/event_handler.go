package wa

import (
	"context"
	"log"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/jackc/pgx/v5/pgtype"
	"go.mau.fi/whatsmeow/appstate"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

type KontakEventHandler struct {
	client   *WhatsappClient
	db       db.Querier
	clientID string
}

func NewKontakEventHandler(clientID string, client *WhatsappClient, db db.Querier) *KontakEventHandler {
	return &KontakEventHandler{
		clientID: clientID,
		client:   client,
		db:       db,
	}
}

func (w *KontakEventHandler) handler(rawEvt interface{}) {
	switch evt := rawEvt.(type) {
	case *events.AppStateSyncComplete:
		w.handleAppStateSyncComplete(evt)
	case *events.Connected, *events.PushNameSetting:
		w.handleConnection(evt)
	case *events.PairSuccess:
		w.handlePairSuccess(evt)
	case *events.StreamReplaced:
		log.Println("Received StreamReplaced event")
		return
	case *events.AppState:
		log.Printf("AppState: %v", evt)
	case *events.LoggedOut:
		w.handleLoggedOut(evt)
	case *events.Disconnected:
		w.setConnectionStatus(false)
	}
}

func (w *KontakEventHandler) handleAppStateSyncComplete(evt *events.AppStateSyncComplete) {
	if len(w.client.GetClient(w.clientID).Store.PushName) > 0 && evt.Name == appstate.WAPatchCriticalBlock {
		w.sendPresence()
	}
	w.setConnectionStatus(true)
}

func (w *KontakEventHandler) handleConnection(evt interface{}) {
	if len(w.client.GetClient(w.clientID).Store.PushName) == 0 {
		return
	}
	w.sendPresence()
	w.setConnectionStatus(true)
}

func (w *KontakEventHandler) handlePairSuccess(evt *events.PairSuccess) {
	log.Println("Pairing successful ")
	jid := evt.ID
	w.setClientJID(jid.String())
	w.setConnectionStatus(true)
}

func (w *KontakEventHandler) handleLoggedOut(evt *events.LoggedOut) {
	log.Printf("Reason for logout: %v", evt.Reason)
	w.client.DisconnectClient(w.clientID)
	w.setConnectionStatus(false)
}

func (w *KontakEventHandler) sendPresence() {
	err := w.client.GetClient(w.clientID).SendPresence(types.PresenceAvailable)
	if err != nil {
		log.Printf("Failed to send available presence")
	} else {
		log.Println("Marked self as available")
	}
}

func (w *KontakEventHandler) setConnectionStatus(isConnected bool) {
	_, err := w.db.SetConnectionStatus(context.Background(), db.SetConnectionStatusParams{
		IsConnected: pgtype.Bool{
			Bool:  isConnected,
			Valid: true,
		},
		ID: w.clientID,
	})
	if err != nil {
		log.Printf("Failed to set connection status to %v", isConnected)
	}
}

func (w *KontakEventHandler) setClientJID(jid string) {
	_, err := w.db.SetClientJID(context.Background(), db.SetClientJIDParams{
		Jid: pgtype.Text{
			String: jid,
			Valid:  true,
		},
		ID: w.clientID,
	})
	if err != nil {
		log.Printf("Failed to set client jid")
	}
}
