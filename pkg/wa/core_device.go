package wa

import (
	"context"
	"fmt"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store"
)

// Connect initializes and connects the WhatsApp client.
func (w *WhatsappClient) Connect(ctx context.Context) {

	clients, _ := w.store.GetClients(context.Background())

	for _, client := range clients {
		logger.Info("Connecting to Whatsapp %s", client.Jid.String)
		go w.Start(ctx, client)
	}
}

// Disconnect disconnects the WhatsApp client.
func (w *WhatsappClient) Disconnect() {
	for id := range w.runningClients { // Simplified range expression
		_, err := w.DisconnectDevice(id)
		if err != nil {
			return
		}
	}
}

func (w *WhatsappClient) IsConnected(clientID string) bool {
	if client, ok := w.runningClients[clientID]; ok {
		return client.IsConnected() && client.IsLoggedIn()
	}
	return false

}

func (w *WhatsappClient) RetrieveDevice(clientID string) *whatsmeow.Client {
	if client, ok := w.runningClients[clientID]; ok {
		return client
	}
	return nil
}

func (w *WhatsappClient) DisconnectDevice(clientID string) (bool, error) {
	if client, ok := w.runningClients[clientID]; ok {
		client.Disconnect()
		delete(w.runningClients, clientID)
		return true, nil
	}
	return false, fmt.Errorf("client %s not found", clientID)
}

// New helper function to get device store
func (w *WhatsappClient) getDeviceStore(ctx context.Context, client db.Client) (*store.Device, error) {
	if client.Jid.String != "" {
		jid, _ := parseJID(client.Jid.String)
		return w.store.GetDevice(ctx, jid)
	}
	logger.Info("JID is empty. Creating new device")
	return w.store.NewDevice(), nil
}
