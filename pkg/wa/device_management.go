package wa

import (
	"context"
	"fmt"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/oklog/ulid/v2"
)

// Device represents a device with a name and mobile number.
type Device struct {
	Name         string `json:"name"`
	MobileNumber string `json:"mobile_number"`
}

// DeviceManagement manages device operations with the database.
type DeviceManagement struct {
	db db.Querier
}

// NewDeviceManagement creates a new instance of DeviceManagement.
func NewDeviceManagement(db db.Querier) *DeviceManagement {
	return &DeviceManagement{
		db: db,
	}
}

// Register registers a new device in the database.
func (cm *DeviceManagement) Register(ctx context.Context, device Device) (db.Client, error) {
	dvc, err := cm.db.CreateNewClient(ctx, db.CreateNewClientParams{
		ID:   ulid.Make().String(),
		Name: device.Name,
		WhatsappNumber: pgtype.Text{
			String: device.MobileNumber,
			Valid:  true,
		},
	})
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to register device: %w", err)
	}
	return dvc, nil
}

// GetClient retrieves a client from the database by ID.
func (cm *DeviceManagement) GetClient(ctx context.Context, id string) (db.Client, error) {

	dvc, err := cm.db.GetClient(ctx, id)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to get device: %w", ErrClientNotFound)
	}

	return dvc, nil
}

// GetClients retrieves all clients from the database.
func (cm *DeviceManagement) GetClients(ctx context.Context) ([]db.Client, error) {
	dvc, err := cm.db.GetClients(ctx)
	if err != nil {
		return []db.Client{}, fmt.Errorf("failed to get clients: %w", err)
	}
	return dvc, nil
}

func (cm *DeviceManagement) SetQR(ctx context.Context, clientID string, qr string) (db.Client, error) {

	client, err := cm.db.UpdateQRCode(ctx, db.UpdateQRCodeParams{
		QrCode: pgtype.Text{
			String: qr,
			Valid:  true,
		},
		ID: clientID,
	})

	if err != nil {
		return db.Client{}, fmt.Errorf("failed to update qr code: %w", err)
	}

	return client, nil

}

func (cm *DeviceManagement) SetClientJID(ctx context.Context, clientID string, jid string) (db.Client, error) {
	client, err := cm.db.SetClientJID(ctx, db.SetClientJIDParams{
		Jid: pgtype.Text{
			String: jid,
			Valid:  true,
		},
		ID: clientID,
	})

	if err != nil {
		return db.Client{}, fmt.Errorf("failed to update qr code: %w", err)
	}

	return client, nil
}

func (cm *DeviceManagement) DeleteClient(ctx context.Context, clientID string) (db.Client, error) {
	err := cm.db.DeleteClient(ctx, clientID)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to delete client: %w", err)
	}
	return db.Client{}, nil
}
