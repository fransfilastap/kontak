package migrations

import (
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"strings"

	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/httpfs"
	_ "github.com/jackc/pgx/v5/stdlib" // pgx driver for database/sql
)

//go:embed schema/*.sql
var migrationsFS embed.FS

// RunMigrations runs database migrations using embedded migration files and golang-migrate
func RunMigrations(dbURL string) error {
	logger.Info("Running database migrations using golang-migrate...")

	// Connect to the database using database/sql
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer db.Close()

	// Check if the database is already initialized
	initialized, err := isDatabaseInitialized(db)
	if err != nil {
		return fmt.Errorf("failed to check if database is initialized: %w", err)
	}

	if initialized {
		logger.Info("Database already initialized, skipping migrations")
		return nil
	}

	// Create a filesystem that golang-migrate can use
	subFS, err := fs.Sub(migrationsFS, "schema")
	if err != nil {
		return fmt.Errorf("failed to create sub filesystem: %w", err)
	}

	// Create a source driver using the embedded filesystem
	sourceDriver, err := httpfs.New(http.FS(subFS), ".")
	if err != nil {
		return fmt.Errorf("failed to create source driver: %w", err)
	}

	// Create a database driver
	dbDriver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create database driver: %w", err)
	}

	// Create a new migrate instance
	m, err := migrate.NewWithInstance("httpfs", sourceDriver, "postgres", dbDriver)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	// Check if the database is dirty
	version, dirty, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	if dirty {
		logger.Warn("Database has a dirty migration at version %d. Forcing version to clean state.", version)
		if err := m.Force(int(version)); err != nil {
			return fmt.Errorf("failed to force migration version: %w", err)
		}
	}

	// Run migrations
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		// If we get a "table already exists" error, it means the database is already initialized
		// but the migration table doesn't exist. We can safely ignore this error.
		if strings.Contains(err.Error(), "already exists") {
			logger.Warn("Tables already exist but migration history not found. Marking as migrated.")
			return nil
		}
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// Get the current version
	version, dirty, err = m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	if dirty {
		logger.Warn("Database has a dirty migration at version %d", version)
	} else if !errors.Is(err, migrate.ErrNilVersion) {
		logger.Info("Database migrated to version %d", version)
	} else {
		logger.Info("No migrations applied (database is empty)")
	}

	logger.Info("Database migrations completed successfully")
	return nil
}

// isDatabaseInitialized checks if the database already has the required tables
func isDatabaseInitialized(db *sql.DB) (bool, error) {
	// Check if at least one of the main tables exists
	var exists bool
	err := db.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients')").Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check if tables exist: %w", err)
	}

	if exists {
		logger.Info("Found existing tables in the database")
		return true, nil
	}

	return false, nil
}
