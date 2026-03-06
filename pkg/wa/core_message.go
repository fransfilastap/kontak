package wa

import (
	"context"
	"fmt"
	"strings"

	"github.com/fransfilastap/kontak/pkg/logger"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

// SendMessage sends a text message to a specified recipient and returns the WhatsApp message ID.
func (w *WhatsappClient) SendMessage(clientID string, recipient string, message string) (string, error) {
	logger.Info("SendMessage: clientID=%s recipient=%s", clientID, recipient)

	client, ok := w.runningClients[clientID]
	if !ok {
		return "", fmt.Errorf("client %s not found", clientID)
	}

	jid, err := getJID(recipient)
	if err != nil {
		logger.Error("SendMessage: failed to parse jid for %s: %v", recipient, err)
		return "", fmt.Errorf("failed to parse jid: %v", err)
	}
	msg := &waE2E.Message{
		Conversation: &message,
	}
	resp, err := client.SendMessage(context.Background(), jid, msg)
	if err != nil {
		logger.Error("SendMessage: failed to send to %s: %v", recipient, err)
		return "", fmt.Errorf("failed to send message: %v", err)
	}
	logger.Info("SendMessage: success to %s, messageID=%s", recipient, resp.ID)
	return resp.ID, nil
}

func (w *WhatsappClient) SendMediaMessage(clientID string, recipient string, mediaFile []byte, fileName string, contentType string) (string, error) {
	client, ok := w.runningClients[clientID]
	if !ok {
		return "", fmt.Errorf("client %s not found", clientID)
	}

	jid, err := getJID(recipient)
	if err != nil {
		return "", fmt.Errorf("failed to parse jid: %v", err)
	}

	var mediaType whatsmeow.MediaType
	if strings.HasPrefix(contentType, "image/") {
		mediaType = whatsmeow.MediaImage
	} else if strings.HasPrefix(contentType, "video/") {
		mediaType = whatsmeow.MediaVideo
	} else if strings.HasPrefix(contentType, "audio/") {
		mediaType = whatsmeow.MediaAudio
	} else {
		mediaType = whatsmeow.MediaDocument
	}

	resp, err := client.Upload(context.Background(), mediaFile, mediaType)
	if err != nil {
		return "", fmt.Errorf("failed to upload media: %v", err)
	}

	var msg waE2E.Message
	if mediaType == whatsmeow.MediaImage {
		msg.ImageMessage = &waE2E.ImageMessage{
			Caption:       proto.String(fileName),
			Mimetype:      proto.String(contentType),
			URL:           &resp.URL,
			DirectPath:    &resp.DirectPath,
			MediaKey:      resp.MediaKey,
			FileEncSHA256: resp.FileEncSHA256,
			FileSHA256:    resp.FileSHA256,
			FileLength:    &resp.FileLength,
		}
	} else if mediaType == whatsmeow.MediaVideo {
		msg.VideoMessage = &waE2E.VideoMessage{
			Caption:       proto.String(fileName),
			Mimetype:      proto.String(contentType),
			URL:           &resp.URL,
			DirectPath:    &resp.DirectPath,
			MediaKey:      resp.MediaKey,
			FileEncSHA256: resp.FileEncSHA256,
			FileSHA256:    resp.FileSHA256,
			FileLength:    &resp.FileLength,
		}
	} else if mediaType == whatsmeow.MediaAudio {
		msg.AudioMessage = &waE2E.AudioMessage{
			Mimetype:      proto.String(contentType),
			URL:           &resp.URL,
			DirectPath:    &resp.DirectPath,
			MediaKey:      resp.MediaKey,
			FileEncSHA256: resp.FileEncSHA256,
			FileSHA256:    resp.FileSHA256,
			FileLength:    &resp.FileLength,
		}
	} else {
		msg.DocumentMessage = &waE2E.DocumentMessage{
			Title:         proto.String(fileName),
			FileName:      proto.String(fileName),
			Mimetype:      proto.String(contentType),
			URL:           &resp.URL,
			DirectPath:    &resp.DirectPath,
			MediaKey:      resp.MediaKey,
			FileEncSHA256: resp.FileEncSHA256,
			FileSHA256:    resp.FileSHA256,
			FileLength:    &resp.FileLength,
		}
	}

	sendResp, err := client.SendMessage(context.Background(), jid, &msg)
	if err != nil {
		return "", fmt.Errorf("failed to send message: %v", err)
	}
	return sendResp.ID, nil
}
