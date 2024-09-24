package app

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/fransfilastap/kontak/pkg/config"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/fransfilastap/kontak/pkg/types"
	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/fransfilastap/kontak/pkg/webhook"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Kontak struct {
	HttpServer     *webhook.Server
	WhatsappClient *wa.WhatsappClient
	Config         *config.Config
	qrChan         chan types.WaConnectEvent
}

func NewKontak(config *config.Config) *Kontak {

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	qrChan := make(chan types.WaConnectEvent)

	dbQueries, dberr := connectDatabase(config.DB)
	if dberr != nil {
		log.Fatalf("Could not connect to database: %v\n", dberr)
	}

	// Create initial user
	createInitialUser(dbQueries)

	waClient := wa.NewWhatsappClient(config.DB, dbQueries, qrChan)
	deviceManagement := wa.NewDeviceManagement(dbQueries)

	webhookHandler := webhook.NewWebhook(waClient, deviceManagement)
	authHandler := webhook.NewAuthHandler(dbQueries, config)

	httpServer := webhook.NewServer(addr, webhookHandler, authHandler, dbQueries)

	return &Kontak{
		HttpServer: httpServer,

		WhatsappClient: waClient,
		Config:         config,
		qrChan:         qrChan,
	}
}

func (app *Kontak) Run() {
	var wg sync.WaitGroup
	go app.HttpServer.Start()

	app.WhatsappClient.ConnectToWhatsapp()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	log.Printf("Server is shutting down due to signal: %v\n", sig)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := app.HttpServer.Shutdown(ctx); err != nil {
			log.Fatalf("Could not gracefully shutdown the server: %v\n", err)
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		log.Println("Disconnecting from Whatsapp")
		app.WhatsappClient.DisconnectFromWhatsapp()
	}()

	wg.Wait()
	log.Println("Server gracefully stopped")
	cancel() // Call cancel to ensure context is released
}

func connectDatabase(dburl string) (db.Querier, error) {
	dbConnection, err := pgxpool.New(context.Background(), dburl)
	if err != nil {
		return nil, err
	}

	return db.New(dbConnection), nil
}
func createInitialUser(dbQuerier db.Querier) error {
	ctx := context.Background()
	users, err := dbQuerier.GetUsers(ctx)
	if err != nil {
		return fmt.Errorf("failed to get users: %w", err)
	}

	if len(users) == 0 {
		initialUsername := os.Getenv("INIT_USER")
		initialPassword := os.Getenv("INIT_PASS")

		hash, err := security.GenerateHash(initialPassword)
		if err != nil {
			return fmt.Errorf("failed to generate password hash: %w", err)
		}

		_, err = dbQuerier.CreateUser(ctx, db.CreateUserParams{
			Username: initialUsername,
			Password: hash,
		})
		if err != nil {
			return fmt.Errorf("failed to create initial user: %w", err)
		}

		log.Println("Initial user 'admin' created. Please change the password after first login.")
	}

	return nil
}
