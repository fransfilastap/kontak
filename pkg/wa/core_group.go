package wa

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow/types"
)

// GetJoinedGroups retrieves the list of groups the specified client has joined.
// Returns a slice of GroupInfo pointers or an error if the client is not found or another issue occurs.
func (w *WhatsappClient) GetJoinedGroups(clientID string) ([]*types.GroupInfo, error) {
	client, ok := w.runningClients[clientID]
	if ok {
		groups, err := client.GetJoinedGroups(context.Background())
		if err != nil {
			return nil, err
		}

		return groups, nil
	}

	return nil, fmt.Errorf("client %s not found", clientID)
}
