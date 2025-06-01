# Embedded Database Migrations with golang-migrate

This document explains how database migrations are now handled in the Kontak application using the golang-migrate library.

## Overview

Previously, database migrations were handled by a separate service in the Docker Compose setup, which required the SQL migration files to be available at deployment time. This approach had the following limitations:

1. It required the entire project repository to be available during deployment
2. It added complexity to the deployment process with an additional service
3. It created a dependency between the application and external migration files

To address these limitations, migrations are now embedded directly into the application binary using Go's `embed` package and managed by the golang-migrate library. This allows the application to be deployed as a single binary or Docker container without needing access to the original migration files.

## How It Works

1. Migration files are embedded into the application binary at build time
2. When the application starts, it automatically runs any pending migrations using golang-migrate
3. The golang-migrate library tracks which migrations have been applied in its own schema version table

## Implementation Details

- Migration files are stored in `pkg/migrations/schema/`
- We use the golang-migrate/migrate library (v4) for robust migration handling
- The `migrations` package provides a `RunMigrations` function that:
  - Checks if the database is already initialized
  - Creates a source driver for the embedded migration files
  - Creates a database driver for the PostgreSQL database
  - Handles dirty migration states automatically
  - Applies any new migrations in order

## Deployment Instructions

### Docker Deployment

Simply use the provided Docker Compose file:

```bash
docker-compose up -d
```

The application container will automatically run migrations on startup.

### Single Binary Deployment

1. Build the application:
   ```bash
   go build -o kontak cmd/main.go
   ```

2. Run the binary with appropriate environment variables:
   ```bash
   DB=postgres://user:password@localhost:5432/dbname ./kontak
   ```

## Adding New Migrations

To add a new migration:

1. Create new migration files in `pkg/migrations/schema/` following the naming convention:
   - `NNNNNN_description.up.sql` for the migration
   - `NNNNNN_description.down.sql` for the rollback (if needed)

2. Rebuild the application to include the new migrations

## Testing Migrations

You can test migrations separately using the provided test script:

```bash
go run cmd/test_migrations.go
```

This will attempt to run all migrations without starting the full application.
