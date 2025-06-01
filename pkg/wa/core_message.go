package wa

import (
	"context"
	"fmt"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

// SendMessage sends a text message to a specified recipient.
func (w *WhatsappClient) SendMessage(clientID string, recipient string, message string) error {
	jid, err := getJID(recipient)
	if err != nil {
		return fmt.Errorf("failed to parse jid: %v", err)
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

func (w *WhatsappClient) SendMediaMessage(clientID string, recipient string, mediaFile []byte, caption string) error {
	jid, err := getJID(recipient)
	if err != nil {
		return fmt.Errorf("failed to parse jid: %v", err)
	}

	resp, err := w.runningClients[clientID].Upload(context.Background(), mediaFile, whatsmeow.MediaImage)

	imageMsg := &waE2E.ImageMessage{
		Caption:  proto.String(caption),
		Mimetype: proto.String("image/png"), // replace this with the actual mime type
		// you can also optionally add other fields like ContextInfo and JpegThumbnail here
		JPEGThumbnail: mediaFile,
		URL:           &resp.URL,
		DirectPath:    &resp.DirectPath,
		MediaKey:      resp.MediaKey,
		FileEncSHA256: resp.FileEncSHA256,
		FileSHA256:    resp.FileSHA256,
		FileLength:    &resp.FileLength,
	}

	_, err = w.runningClients[clientID].SendMessage(context.Background(), jid, &waE2E.Message{
		ImageMessage: imageMsg,
	})
	if err != nil {
		return fmt.Errorf("failed to send message: %v tp %v", err, resp)
	}
	return nil
}
