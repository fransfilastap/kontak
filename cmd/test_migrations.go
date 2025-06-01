package main

import (
	"os"

	"github.com/fransfilastap/kontak/pkg/config"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/fransfilastap/kontak/pkg/migrations"
)

func main() {
	// Initialize logger
	logger.Init(logger.Config{
		Level:      logger.InfoLevel,
		Output:     os.Stdout,
		TimeFormat: "2006-01-02 15:04:05",
		NoColor:    false,
	})

	// Load configuration
	cfg := config.LoadConfig()

	// Run migrations
	logger.Info("Testing migrations...")
	if err := migrations.RunMigrations(cfg.DB); err != nil {
		logger.Fatal("Failed to run migrations: %v", err)
	}

	logger.Info("Migrations completed successfully!")
}
