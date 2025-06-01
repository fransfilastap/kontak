package wa

import (
	"context"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/oklog/ulid/v2"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
)

// Store defines the interface for WhatsApp storage operations
type Store interface {
	// Client management operations
	GetClients(ctx context.Context) ([]db.Client, error)
	GetClient(ctx context.Context, id string) (db.Client, error)
	CreateClient(ctx context.Context, name, mobileNumber string) (db.Client, error)
	DeleteClient(ctx context.Context, id string) error

	// Device store operations
	GetDevice(ctx context.Context, jid types.JID) (*store.Device, error)
	NewDevice() *store.Device

	// Status update operations
	UpdateQRCode(ctx context.Context, clientID, code string) error
	SetConnectionStatus(ctx context.Context, clientID string, isConnected bool) error
	SetClientJID(ctx context.Context, clientID, jid string) error

	// Group operations
	SyncGroups(ctx context.Context, clientID string, groups []*types.GroupInfo) error
}

// PostgresStore implements the Store interface using PostgreSQL
type PostgresStore struct {
	dbQueries db.Querier
	container *sqlstore.Container
}

// NewPostgresStore creates a new PostgreSQL-based store
func NewPostgresStore(ctx context.Context, database string, dbQueries db.Querier, logger waLog.Logger) (*PostgresStore, error) {
	container, err := sqlstore.New(ctx, "pgx", database, logger)
	if err != nil {
		return nil, err
	}

	return &PostgresStore{
		dbQueries: dbQueries,
		container: container,
	}, nil
}

// GetClients retrieves all clients from the database
func (s *PostgresStore) GetClients(ctx context.Context) ([]db.Client, error) {
	return s.dbQueries.GetClients(ctx)
}

// GetClient retrieves a client from the database by ID
func (s *PostgresStore) GetClient(ctx context.Context, id string) (db.Client, error) {
	return s.dbQueries.GetClient(ctx, id)
}

// CreateClient creates a new client in the database
func (s *PostgresStore) CreateClient(ctx context.Context, name, mobileNumber string) (db.Client, error) {
	return s.dbQueries.CreateNewClient(ctx, db.CreateNewClientParams{
		ID:   ulid.Make().String(),
		Name: name,
		WhatsappNumber: pgtype.Text{
			String: mobileNumber,
			Valid:  true,
		},
	})
}

// DeleteClient deletes a client from the database
func (s *PostgresStore) DeleteClient(ctx context.Context, id string) error {
	return s.dbQueries.DeleteClient(ctx, id)
}

// GetDevice retrieves a device from the container
func (s *PostgresStore) GetDevice(ctx context.Context, jid types.JID) (*store.Device, error) {
	return s.container.GetDevice(ctx, jid)
}

// NewDevice creates a new device in the container
func (s *PostgresStore) NewDevice() *store.Device {
	return s.container.NewDevice()
}

// UpdateQRCode updates the QR code for a client
func (s *PostgresStore) UpdateQRCode(ctx context.Context, clientID, code string) error {
	_, err := s.dbQueries.UpdateQRCode(ctx, db.UpdateQRCodeParams{
		QrCode: pgtype.Text{
			String: code,
			Valid:  true,
		},
		ID: clientID,
	})
	return err
}

// SetConnectionStatus updates the connection status for a client
func (s *PostgresStore) SetConnectionStatus(ctx context.Context, clientID string, isConnected bool) error {
	_, err := s.dbQueries.SetConnectionStatus(ctx, db.SetConnectionStatusParams{
		IsConnected: pgtype.Bool{
			Bool:  isConnected,
			Valid: true,
		},
		ID: clientID,
	})
	return err
}

// SetClientJID updates the JID for a client
func (s *PostgresStore) SetClientJID(ctx context.Context, clientID, jid string) error {
	_, err := s.dbQueries.SetClientJID(ctx, db.SetClientJIDParams{
		Jid: pgtype.Text{
			String: jid,
			Valid:  true,
		},
		ID: clientID,
	})
	return err
}

func (s *PostgresStore) SyncGroups(ctx context.Context, clientID string, groups []*types.GroupInfo) error {
	for _, group := range groups {
		err := s.dbQueries.UpsertWhatsAppGroup(ctx, db.UpsertWhatsAppGroupParams{
			DeviceID: pgtype.Text{
				String: clientID,
				Valid:  true,
			},
			GroupID:   group.JID.String(),
			GroupName: group.Name,
			GroupDescription: pgtype.Text{
				String: group.Name,
				Valid:  true,
			},
			ParticipantCount: pgtype.Int4{
				Int32: int32(len(group.Participants)),
				Valid: true,
			},
		})
		if err != nil {
			return err
		}
	}

	return nil
}
