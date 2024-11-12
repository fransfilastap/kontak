package wa

import (
	"context"
	"fmt"
	"log"

	"github.com/fransfilastap/kontak/pkg/db"
	kontaktypes "github.com/fransfilastap/kontak/pkg/types"
	"github.com/jackc/pgx/v5/pgtype"
	_ "github.com/jackc/pgx/v5/stdlib"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// WhatsappClient handles the WhatsApp client operations including sending and receiving messages, connecting, and disconnecting.
// It uses the whatsmeow library to interact with the WhatsApp service and sqlstore for database operations.
type WhatsappClient struct {
	database       string // database connection string
	dbQueries      db.Querier
	container      *sqlstore.Container               // SQLStore container for managing database interactions
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

// ConnectToWhatsapp initializes and connects the WhatsApp client.
func (w *WhatsappClient) ConnectToWhatsapp() {

	clients, _ := w.dbQueries.GetClients(context.Background())

	for _, client := range clients {
		log.Println("Connecting to Whatsapp", client.Jid.String)
		go w.StartClient(client)
	}
}

func (w *WhatsappClient) StartClient(client db.Client) {

	if w.runningClients[client.ID] != nil && w.IsConnected(client.ID) {
		log.Println("Client already connected")
		return
	}

	log.Println("Starting client", client.ID)

	deviceStore, err := w.getDeviceStore(client)
	if err != nil {
		log.Println("Failed to get device store", err)
		return
	}

	if deviceStore == nil {
		deviceStore = w.container.NewDevice()
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	waClient := whatsmeow.NewClient(deviceStore, clientLog)
	eventHandler := NewKontakEventHandler(client.ID, w, w.dbQueries)
	waClient.AddEventHandler(eventHandler.handler)

	log.Println("Connecting to Whatsapp", deviceStore)

	w.runningClients[client.ID] = waClient

	if waClient.Store.ID == nil {
		w.handleQRCode(client, waClient)
	} else {
		log.Println("Already logged in")
		err = waClient.Connect()

		if err != nil {
			log.Println("Failed to connect to whatsapp", err)
			return
		}
		log.Println("Connected to whatsapp")
	}
}

// New helper function to get device store
func (w *WhatsappClient) getDeviceStore(client db.Client) (*store.Device, error) {
	if client.Jid.String != "" {
		jid, _ := parseJID(client.Jid.String)
		return w.container.GetDevice(jid)
	}
	log.Println("JID is empty. Creating new device")
	return w.container.NewDevice(), nil
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
			log.Println("Received QR code", evt.Code)
			w.updateQRCode(client.ID, evt.Code)
		case "success":
			w.updateQRCode(client.ID, "")
		case "timeout":
			w.GetClient(client.ID).Disconnect()
			delete(w.runningClients, client.ID)
			w.updateQRCode(client.ID, "")
		default:
			log.Println("Unknown event", evt)
		}
	}
}

// New helper function to update QR code
func (w *WhatsappClient) updateQRCode(clientID string, code string) {
	_, err := w.dbQueries.UpdateQRCode(context.Background(), db.UpdateQRCodeParams{
		QrCode: pgtype.Text{String: code, Valid: true},
		ID:     clientID,
	})
	if err != nil {
		log.Println("Failed to update QR code", err)
	}
}

// DisconnectFromWhatsapp disconnects the WhatsApp client.
func (w *WhatsappClient) DisconnectFromWhatsapp() {
	for id := range w.runningClients { // Simplified range expression
		w.DisconnectClient(id)
	}
}

func (w *WhatsappClient) IsConnected(clientID string) bool {
	if client, ok := w.runningClients[clientID]; ok {
		return client.IsConnected()
	}
	return false

}

func (w *WhatsappClient) GetClient(clientID string) *whatsmeow.Client {
	if client, ok := w.runningClients[clientID]; ok {
		return client
	}
	return nil
}

func (w *WhatsappClient) DisconnectClient(clientID string) (bool, error) {
	if client, ok := w.runningClients[clientID]; ok {
		client.Disconnect()
		delete(w.runningClients, clientID)
		return true, nil
	}
	return false, fmt.Errorf("client %s not found", clientID)
}

// NewWhatsappClient creates a new instance of WhatsappClient.
func NewWhatsappClient(database string, dbQueries db.Querier, qr chan<- kontaktypes.WaConnectEvent) *WhatsappClient {
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New("pgx", database, dbLog)
	if err != nil {
		panic(err)
	}

	client := &WhatsappClient{
		database:       database,
		container:      container,
		qr:             qr,
		runningClients: make(map[string]*whatsmeow.Client),
		dbQueries:      dbQueries,
	}

	return client
}
