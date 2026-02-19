package wa

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow/types"
)

// GetContacts retrieves all contacts for the specified client.
func (w *WhatsappClient) GetContacts(clientID string) (map[types.JID]types.ContactInfo, error) {
	client, ok := w.runningClients[clientID]
	if ok {
		contacts, err := client.Store.Contacts.GetAllContacts(context.Background())
		if err != nil {
			return nil, err
		}

		return contacts, nil
	}

	return nil, fmt.Errorf("client %s not found", clientID)
}
