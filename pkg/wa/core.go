package wa

import (
	"context"
	"fmt"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	kontaktypes "github.com/fransfilastap/kontak/pkg/types"
	_ "github.com/jackc/pgx/v5/stdlib"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// WhatsappClient handles the WhatsApp client operations including sending and receiving messages, connecting, and disconnecting.
// It uses the whatsmeow library to interact with the WhatsApp service and a Store interface for database operations.
type WhatsappClient struct {
	store          Store                             // Store interface for database and device operations
	qr             chan<- kontaktypes.WaConnectEvent // Channel to send WhatsApp connection events such as QR codes
	runningClients map[string]*whatsmeow.Client
}

// SendMessage sends a text message to a specified recipient.
func (w *WhatsappClient) SendMessage(clientID string, recipient string, message string) error {
	formatJID := fmt.Sprintf("%s@s.whatsapp.net", recipient)
	jid, ok := types.ParseJID(formatJID)
	if ok != nil {
		return fmt.Errorf("failed to parse jid: %v", ok)
	}
	msg := &waE2E.Message{
		Conversation: &message,
	}
	resp, err := w.runningClients[clientID].SendMessage(context.Background(), jid, msg)
	if err != nil {
		return fmt.Errorf("failed to send message: %v tp %v", err, resp)
	}
	return nil
}

// Connect initializes and connects the WhatsApp client.
func (w *WhatsappClient) Connect(ctx context.Context) {

	clients, _ := w.store.GetClients(context.Background())

	for _, client := range clients {
		logger.Info("Connecting to Whatsapp %s", client.Jid.String)
		go w.Start(ctx, client)
	}
}

func (w *WhatsappClient) Start(ctx context.Context, client db.Client) {

	if w.runningClients[client.ID] != nil && w.IsConnected(client.ID) {
		logger.Info("Client already connected")
		return
	}

	logger.Info("Starting client %s", client.ID)

	deviceStore, err := w.getDeviceStore(ctx, client)
	if err != nil {
		logger.Error("Failed to get device store: %v", err)
		return
	}

	if deviceStore == nil {
		deviceStore = w.store.NewDevice()
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	waClient := whatsmeow.NewClient(deviceStore, clientLog)
	eventHandler := NewKontakEventHandler(client.ID, w, w.store)
	waClient.AddEventHandler(eventHandler.handler)

	logger.Info("Connecting to Whatsapp %v", deviceStore)

	w.runningClients[client.ID] = waClient

	if waClient.Store.ID == nil {
		w.handleQRCode(client, waClient)
	} else {
		logger.Info("Already logged in")
		err = waClient.Connect()

		if err != nil {
			logger.Error("Failed to connect to whatsapp: %v", err)
			return
		}
		logger.Info("Connected to whatsapp")
	}
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

// New helper function to handle QR code events
func (w *WhatsappClient) handleQRCode(client db.Client, waClient *whatsmeow.Client) {
	qrChan, _ := waClient.GetQRChannel(context.Background())
	err := waClient.Connect()
	if err != nil {
		panic(err)
	}

	for evt := range qrChan {
		switch evt.Event {
		case "code":
			logger.Info("Received QR code %s", evt.Code)
			w.updateQRCode(client.ID, evt.Code)
		case "success":
			w.updateQRCode(client.ID, "")
		case "timeout":
			w.RetrieveDevice(client.ID).Disconnect()
			delete(w.runningClients, client.ID)
			w.updateQRCode(client.ID, "")
		default:
			logger.Warn("Unknown event %v", evt)
		}
	}
}

// New helper function to update QR code
func (w *WhatsappClient) updateQRCode(clientID string, code string) {
	err := w.store.UpdateQRCode(context.Background(), clientID, code)
	if err != nil {
		logger.Error("Failed to update QR code: %v", err)
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
		return client.IsConnected()
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

// NewWhatsappClient creates a new instance of WhatsappClient.
func NewWhatsappClient(ctx context.Context, database string, dbQueries db.Querier, qr chan<- kontaktypes.WaConnectEvent) *WhatsappClient {
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	store, err := NewPostgresStore(ctx, database, dbQueries, dbLog)
	if err != nil {
		panic(err)
	}

	client := &WhatsappClient{
		store:          store,
		qr:             qr,
		runningClients: make(map[string]*whatsmeow.Client),
	}

	return client
}
