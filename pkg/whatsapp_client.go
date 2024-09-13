package pkg

import (
	"context"
	"fmt"
	_ "github.com/jackc/pgx/v5/stdlib"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

type WhatsappClient struct {
	database  string
	waClient  *whatsmeow.Client
	container *sqlstore.Container
	qr        chan<- WaConnectEvent
}

func (w *WhatsappClient) SendGeneratedMessage(jid types.JID, incomingMessage string) error {
	msg := &waE2E.Message{
		Conversation: &incomingMessage,
	}
	resp, err := w.waClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		fmt.Printf("Failed to send message: %v tp %v", err, resp)
		return err
	}
	return nil
}

func (w *WhatsappClient) SendMessage(recipient string, message string) error {

	formatJID := fmt.Sprintf("%s@s.whatsapp.net", recipient)

	jid, ok := types.ParseJID(formatJID)
	if ok != nil {
		return fmt.Errorf("failed to parse jid: %v", ok)
	}

	msg := &waE2E.Message{
		Conversation: &message,
	}

	resp, err := w.waClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		return fmt.Errorf("failed to send message: %v tp %v", err, resp)
	}

	return nil
}

func (w *WhatsappClient) Listen() {

	fmt.Println("Starting Whatsapp Client")
	deviceStore, err := w.container.GetFirstDevice()
	if err != nil {
		panic(err)
	}

	handler := func(evt interface{}) {
		switch v := evt.(type) {
		case *events.Message:
			fmt.Println("Received a message!", v.Message.GetConversation())
			//w.SendMessage("6287887998244", "Sudahlah")
		}
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(handler)
	w.waClient = client

	if client.Store.ID == nil {
		qrChan, _ := client.GetQRChannel(context.Background())
		err = client.Connect()
		if err != nil {
			panic(err)
		}

		for evt := range qrChan {
			if evt.Event == "code" {
				w.qr <- WaConnectEvent{
					Event: "NEW_QR",
					Data:  evt.Code,
				}
			}
		}

	} else {
		fmt.Println("Already logged in")
		w.qr <- WaConnectEvent{
			Event: "ALREADY_LOGGED_IN",
			Data:  "Already logged in",
		}
		err = client.Connect()
		if err != nil {
			panic(err)
		}
	}

}

func NewWhatsappClient(database string, qr chan<- WaConnectEvent) *WhatsappClient {

	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New("pgx", database, dbLog)
	if err != nil {
		panic(err)
	}

	client := &WhatsappClient{
		database:  database,
		container: container,
		qr:        qr,
	}

	return client
}
