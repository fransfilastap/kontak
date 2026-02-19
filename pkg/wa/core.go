package wa

import (
	"context"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	kontaktypes "github.com/fransfilastap/kontak/pkg/types"
	_ "github.com/jackc/pgx/v5/stdlib"
	"go.mau.fi/whatsmeow"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// WhatsappClient handles the WhatsApp client operations including sending and receiving messages, connecting, and disconnecting.
// It uses the whatsmeow library to interact with the WhatsApp service and a Store interface for database operations.
type WhatsappClient struct {
	store          Store                             // Store interface for database and device operations
	db             db.Querier                        // Database queries for message logging
	qr             chan<- kontaktypes.WaConnectEvent // Channel to send WhatsApp connection events such as QR codes
	runningClients map[string]*whatsmeow.Client
}

// NewWhatsappClient creates a new instance of WhatsappClient.
func NewWhatsappClient(ctx context.Context, database string, dbQueries db.Querier, qr chan<- kontaktypes.WaConnectEvent) *WhatsappClient {
	dbLog := waLog.Stdout("Database", "DEBUG", true)
	pgStore, err := NewPostgresStore(ctx, database, dbQueries, dbLog)
	if err != nil {
		panic(err)
	}

	client := &WhatsappClient{
		store:          pgStore,
		db:             dbQueries,
		qr:             qr,
		runningClients: make(map[string]*whatsmeow.Client),
	}

	return client
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
	eventHandler := BuildEventHandler(client.ID, w, w.store, w.db)
	waClient.AddEventHandler(eventHandler.handle)

	logger.Info("Connecting to Whatsapp %v", deviceStore)

	w.runningClients[client.ID] = waClient

	if waClient.Store.ID == nil {
		w.watchQRCodeEvents(client, waClient)
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
