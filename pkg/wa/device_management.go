package wa

import (
	"context"
	"fmt"

	"github.com/fransfilastap/kontak/pkg/db"
)

// Device represents a device with a name and mobile number.
type Device struct {
	Name         string `json:"name"`
	MobileNumber string `json:"mobile_number"`
}

// DeviceManagement manages device operations with the database.
type DeviceManagement struct {
	store Store
}

// NewDeviceManagement creates a new instance of DeviceManagement.
func NewDeviceManagement(store Store) *DeviceManagement {
	return &DeviceManagement{
		store: store,
	}
}

// Register registers a new device in the database.
func (cm *DeviceManagement) Register(ctx context.Context, device Device) (db.Client, error) {
	dvc, err := cm.store.CreateClient(ctx, device.Name, device.MobileNumber)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to register device: %w", err)
	}
	return dvc, nil
}

// GetDeviceByID retrieves a client from the database by ID.
func (cm *DeviceManagement) GetDeviceByID(ctx context.Context, id string) (db.Client, error) {
	dvc, err := cm.store.GetClient(ctx, id)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to get device: %w", ErrClientNotFound)
	}
	return dvc, nil
}

// GetDevices retrieves all clients from the database.
func (cm *DeviceManagement) GetDevices(ctx context.Context) ([]db.Client, error) {
	dvc, err := cm.store.GetClients(ctx)
	if err != nil {
		return []db.Client{}, fmt.Errorf("failed to get clients: %w", err)
	}
	return dvc, nil
}

func (cm *DeviceManagement) SetQR(ctx context.Context, clientID string, qr string) (db.Client, error) {
	err := cm.store.UpdateQRCode(ctx, clientID, qr)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to update qr code: %w", err)
	}

	// Get the updated client
	client, err := cm.store.GetClient(ctx, clientID)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to get updated client: %w", err)
	}

	return client, nil
}

func (cm *DeviceManagement) SetDeviceJID(ctx context.Context, clientID string, jid string) (db.Client, error) {
	err := cm.store.SetClientJID(ctx, clientID, jid)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to update client jid: %w", err)
	}

	// Get the updated client
	client, err := cm.store.GetClient(ctx, clientID)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to get updated client: %w", err)
	}

	return client, nil
}

func (cm *DeviceManagement) DeleteClient(ctx context.Context, clientID string) (db.Client, error) {
	// Get the client before deleting it
	client, err := cm.store.GetClient(ctx, clientID)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to get client: %w", err)
	}

	err = cm.store.DeleteClient(ctx, clientID)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to delete client: %w", err)
	}
	return client, nil
}
