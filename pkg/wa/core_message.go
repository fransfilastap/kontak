package wa

import (
	"context"
	"fmt"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
)

// SendMessage sends a text message to a specified recipient.
func (w *WhatsappClient) SendMessage(clientID string, recipient string, message string) error {
	formatJID := fmt.Sprintf("%s@s.whatsapp.net", recipient)
	jid, ok := types.ParseJID(formatJID)
	if ok != nil {
		return fmt.Errorf("failed to parse jid: %v", ok)
	}
	msg := &waE2E.Message{
		Conversation: &message,
	}
	resp, err := w.runningClients[clientID].SendMessage(context.Background(), jid, msg)
	if err != nil {
		return fmt.Errorf("failed to send message: %v tp %v", err, resp)
	}
	return nil
}
