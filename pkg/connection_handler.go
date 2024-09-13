package pkg

import (
	"github.com/labstack/echo/v4"
	"log"
	"net/http"
)

type ConnectionHandler struct {
	qrChan   chan WaConnectEvent
	waClient *WhatsappClient
}

func NewConnectionHandler(qrChan chan WaConnectEvent, waClient *WhatsappClient) *ConnectionHandler {
	return &ConnectionHandler{
		qrChan:   qrChan,
		waClient: waClient,
	}
}

func (ch *ConnectionHandler) Index(c echo.Context) error {
	return c.Render(http.StatusOK, "index", nil) // Use "index.html" instead of "index"
}

func (ch *ConnectionHandler) SendQrHandler(c echo.Context) error {

	w := c.Response()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	for {
		select {
		case <-c.Request().Context().Done():
			log.Printf("SSE client disconnected, ip: %v", c.RealIP())
			return nil
		case qr := <-ch.qrChan:

			if qr.Event == "NEW_QR" {
				log.Printf("Sending QR to client, ip: %v", c.RealIP())
				event := Event{
					Event: []byte("QR_CONNECT"),
					Data:  []byte(qr.Data),
				}
				if err := event.MarshalTo(w); err != nil {
					return err
				}
			}
			if qr.Event == "ALREADY_LOGGED_IN" {
				log.Printf("Sending CONNECTED to client, ip: %v", c.RealIP())
				event := Event{
					Event: []byte("CONNECTED"),
					Data:  []byte("CONNECTED"),
				}
				if err := event.MarshalTo(w); err != nil {
					return err
				}
			}

			w.Flush()
		}
	}
}
