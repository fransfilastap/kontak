package app

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/fransfilastap/kontak/pkg/config"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
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
	// Initialize logger
	logLevel := logger.InfoLevel
	switch config.LogLevel {
	case "debug":
		logLevel = logger.DebugLevel
	case "info":
		logLevel = logger.InfoLevel
	case "warn":
		logLevel = logger.WarnLevel
	case "error":
		logLevel = logger.ErrorLevel
	}

	logger.Init(logger.Config{
		Level:             logLevel,
		Output:            os.Stdout,
		TimeFormat:        time.RFC3339,
		NoColor:           false,
		EnableFileLogging: config.LogFileEnabled,
		LogFilePath:       config.LogFilePath,
		MaxSize:           config.LogFileMaxSize,
		MaxBackups:        config.LogFileMaxBackups,
		MaxAge:            config.LogFileMaxAge,
		Compress:          config.LogFileCompress,
	})

	logger.Info("Initializing Kontak application")

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	qrChan := make(chan types.WaConnectEvent)

	dbQueries, dberr := connectDatabase(config.DB)
	if dberr != nil {
		logger.Fatal("Could not connect to database: %v", dberr)
	}

	// Create initial user
	err := createInitialUser(dbQueries)
	if err != nil {
		return nil
	}

	ctx := context.Background()

	waClient := wa.NewWhatsappClient(ctx, config.DB, dbQueries, qrChan)
	// Use the same store implementation for device management
	store, err := wa.NewPostgresStore(ctx, config.DB, dbQueries, nil)
	if err != nil {
		logger.Fatal("Could not create store: %v", err)
	}
	deviceManagement := wa.NewDeviceStore(store)

	webhookHandler := webhook.NewWebhook(waClient, deviceManagement, dbQueries)
	authHandler := webhook.NewAuthHandler(dbQueries, config)
	groupHandler := webhook.NewGroupHandler(deviceManagement, waClient)

	httpServer := webhook.NewServer(addr, webhookHandler, authHandler, groupHandler, dbQueries)

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

	app.WhatsappClient.Connect(context.Background())

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	logger.Info("Server is shutting down due to signal: %v", sig)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := app.HttpServer.Shutdown(ctx); err != nil {
			logger.Fatal("Could not gracefully shutdown the server: %v", err)
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		logger.Info("Disconnecting from Whatsapp")
		app.WhatsappClient.Disconnect()
	}()

	wg.Wait()
	logger.Info("Server gracefully stopped")
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
			Email:    initialUsername,
			Password: hash,
		})
		if err != nil {
			return fmt.Errorf("failed to create initial user: %w", err)
		}

		logger.Info("Initial user 'admin' created. Please change the password after first login.")
	}

	return nil
}
