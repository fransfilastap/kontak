package wa

import (
	"context"
	"fmt"
	"go.mau.fi/whatsmeow/types"

	"github.com/fransfilastap/kontak/pkg/db"
)

// Device represents a device with a name and mobile number.
type Device struct {
	Name         string `json:"name"`
	MobileNumber string `json:"mobile_number"`
}

// DeviceStore manages device operations with the database.
type DeviceStore struct {
	store Store
}

// NewDeviceStore creates a new instance of DeviceStore.
func NewDeviceStore(store Store) *DeviceStore {
	return &DeviceStore{
		store: store,
	}
}

// Register registers a new device in the database.
func (cm *DeviceStore) Register(ctx context.Context, device Device) (db.Client, error) {
	dvc, err := cm.store.CreateClient(ctx, device.Name, device.MobileNumber)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to register device: %w", err)
	}
	return dvc, nil
}

// GetDeviceByID retrieves a client from the database by ID.
func (cm *DeviceStore) GetDeviceByID(ctx context.Context, id string) (db.Client, error) {
	dvc, err := cm.store.GetClient(ctx, id)
	if err != nil {
		return db.Client{}, fmt.Errorf("failed to get device: %w", ErrClientNotFound)
	}
	return dvc, nil
}

// GetDevices retrieves all clients from the database.
func (cm *DeviceStore) GetDevices(ctx context.Context) ([]db.Client, error) {
	dvc, err := cm.store.GetClients(ctx)
	if err != nil {
		return []db.Client{}, fmt.Errorf("failed to get clients: %w", err)
	}
	return dvc, nil
}

func (cm *DeviceStore) SetQR(ctx context.Context, clientID string, qr string) (db.Client, error) {
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

func (cm *DeviceStore) SetDeviceJID(ctx context.Context, clientID string, jid string) (db.Client, error) {
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

func (cm *DeviceStore) DeleteClient(ctx context.Context, clientID string) (db.Client, error) {
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

// :TODO - Add logging
// SyncJoinedGroups syncs the list of joined groups with the database.
// Returns an error if the client is not found or another issue occurs.
func (cm *DeviceStore) SyncJoinedGroups(ctx context.Context, clientID string, groups []*types.GroupInfo) error {
	_, err := cm.store.GetClient(ctx, clientID)
	if err != nil {
		return fmt.Errorf("failed to get client: %w", err)
	}

	return cm.store.SyncGroups(ctx, clientID, groups)
}

func (cm *DeviceStore) GetJoinedGroups(ctx context.Context, clientID string) ([]db.WhatsappGroup, error) {
	return cm.store.GetJoinedGroups(ctx, clientID)
}

func (cm *DeviceStore) SyncContacts(ctx context.Context, clientID string, contacts map[types.JID]types.ContactInfo) error {
	_, err := cm.store.GetClient(ctx, clientID)
	if err != nil {
		return fmt.Errorf("failed to get client: %w", err)
	}

	return cm.store.SyncContacts(ctx, clientID, contacts)
}

func (cm *DeviceStore) GetContacts(ctx context.Context, clientID string) ([]db.WhatsappContact, error) {
	return cm.store.GetContacts(ctx, clientID)
}
