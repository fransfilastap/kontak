package pkg

import "github.com/labstack/echo/v4"

type Webhook struct {
	whatsappClient *WhatsappClient
}

func NewWebhook(whatsappClient *WhatsappClient) *Webhook {
	return &Webhook{whatsappClient: whatsappClient}
}

func (w *Webhook) Handle(c echo.Context) error {
	var message Message
	if err := c.Bind(&message); err != nil {
		return err
	}

	err := w.whatsappClient.SendMessage(message.MobileNumber, message.Text)
	if err != nil {
		return err
	}

	return c.JSON(200, struct {
		Message string `json:"message"`
	}{
		Message: "Message sent successfully",
	})

}
