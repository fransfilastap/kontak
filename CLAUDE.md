# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kontak is a WhatsApp-to-REST-API bridge. It connects WhatsApp (via Whatsmeow WebSocket library) to a Go REST API, with a Next.js web dashboard for management.

## Architecture

**Backend (Go)** — Entry point: `cmd/main.go` → `pkg/app/kontak.go`
- `pkg/app/` — Application bootstrap: initializes DB, migrations, WhatsApp client, HTTP server, and handles graceful shutdown
- `pkg/http/` — Echo v4 HTTP server with JWT auth, SSE for real-time events, REST handlers for devices/groups/messages/auth
- `pkg/wa/` — Whatsmeow WhatsApp client: device management, message sending, event handling, QR pairing
- `pkg/db/` — sqlc-generated database layer (PostgreSQL via pgx/v5)
- `pkg/migrations/` — golang-migrate migrations, schema files in `pkg/migrations/schema/`
- `pkg/config/` — Environment-based config loaded from `.env` via godotenv
- `pkg/security/` — Password hashing, JWT utilities
- `pkg/logger/` — zerolog-based logging with file rotation (lumberjack)
- `pkg/types/` — Shared types

**Frontend (`web/`)** — Next.js 15 with React 18, shadcn/ui, Tailwind CSS
- Auth via next-auth v5 (beta), SWR for data fetching, Zod for validation
- Package manager: pnpm

**Database** — PostgreSQL, managed via golang-migrate (numbered migration files in `pkg/migrations/schema/`)

## Build & Run Commands

### Backend (Go)
```bash
go build -o main cmd/main.go        # Build
go run cmd/main.go                   # Run (requires .env and PostgreSQL)
go test ./...                        # Run all tests
go test ./pkg/wa/                    # Run tests for a specific package
```

### Frontend (Next.js)
```bash
cd web && pnpm install               # Install dependencies
cd web && pnpm dev                   # Dev server
cd web && pnpm build                 # Production build
cd web && pnpm lint                  # Lint
```

### Database
```bash
sqlc generate                        # Regenerate db code from sql/queries/*.sql
```

### Docker
```bash
docker-compose up                    # Run full stack (api + web + postgres)
```

## Environment Variables

Configured via `.env` file (loaded by godotenv): `PORT`, `HOST`, `DB` (postgres connection string), `JWT_SECRET`, `INIT_USER`, `INIT_PASS`, `LOG_LEVEL`, and `LOG_FILE_*` options.

## Commit Convention

Uses [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>` (e.g., `feat(api): add endpoint`, `fix(web): resolve display issue`). Automated releases via semantic-release.

## Key Patterns

- Database queries are defined in `sql/queries/*.sql` and code-generated into `pkg/db/` via sqlc — edit the SQL files, then run `sqlc generate`
- Migrations use numbered up/down files in `pkg/migrations/schema/` (e.g., `000001_create_clients_table.up.sql`)
- The app auto-runs migrations on startup and creates an initial admin user from `INIT_USER`/`INIT_PASS` env vars
- WhatsApp devices are managed through a PostgreSQL-backed store (`pkg/wa/store.go`)
