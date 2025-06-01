package wa

import (
	"context"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"go.mau.fi/whatsmeow"
)

// New helper function to handle QR code events
func (w *WhatsappClient) watchQRCodeEvents(client db.Client, waClient *whatsmeow.Client) {
	qrChan, _ := waClient.GetQRChannel(context.Background())
	err := waClient.Connect()
	if err != nil {
		panic(err)
	}

	for evt := range qrChan {
		switch evt.Event {
		case "code":
			logger.Info("Received QR code %s", evt.Code)
			w.refreshQRCode(client.ID, evt.Code)
		case "success":
			w.refreshQRCode(client.ID, "")
		case "timeout":
			w.RetrieveDevice(client.ID).Disconnect()
			delete(w.runningClients, client.ID)
			w.refreshQRCode(client.ID, "")
		default:
			logger.Warn("Unknown event %v", evt)
		}
	}
}

// New helper function to update QR code
func (w *WhatsappClient) refreshQRCode(clientID string, code string) {
	err := w.store.UpdateQRCode(context.Background(), clientID, code)
	if err != nil {
		logger.Error("Failed to update QR code: %v", err)
	}
}
