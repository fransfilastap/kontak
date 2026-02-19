package wa

import (
	"context"
	"fmt"
	"strings"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/proto"
)

// SendMessage sends a text message to a specified recipient and returns the WhatsApp message ID.
func (w *WhatsappClient) SendMessage(clientID string, recipient string, message string) (string, error) {
	jid, err := getJID(recipient)
	if err != nil {
		return "", fmt.Errorf("failed to parse jid: %v", err)
	}
	msg := &waE2E.Message{
		Conversation: &message,
	}
	resp, err := w.runningClients[clientID].SendMessage(context.Background(), jid, msg)
	if err != nil {
		return "", fmt.Errorf("failed to send message: %v tp %v", err, resp)
	}
	return resp.ID, nil
}

func (w *WhatsappClient) SendMediaMessage(clientID string, recipient string, mediaFile []byte, fileName string, contentType string) (string, error) {
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

	resp, err := w.runningClients[clientID].Upload(context.Background(), mediaFile, mediaType)
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

	sendResp, err := w.runningClients[clientID].SendMessage(context.Background(), jid, &msg)
	if err != nil {
		return "", fmt.Errorf("failed to send message: %v", err)
	}
	return sendResp.ID, nil
}
