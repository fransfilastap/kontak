package webhook

import (
	"errors"
	"net/http"
	"time"

	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/labstack/echo/v4"
)

type Webhook struct {
	whatsappClient   *wa.WhatsappClient
	deviceManagement *wa.DeviceManagement
}

func NewWebhook(whatsappClient *wa.WhatsappClient, management *wa.DeviceManagement) *Webhook {
	return &Webhook{whatsappClient: whatsappClient, deviceManagement: management}
}

// RegisterDevice registers a new WhatsApp device from the provided request data.
// It binds request data to the wa.Device struct, attempts to register the device with deviceManagement,
// and returns a JSON response with the registered device's information or an error message.
func (w *Webhook) RegisterDevice(c echo.Context) error {
	var req wa.Device
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, ErrorResponse{
			Error: err.Error(),
		})
	}

	dev, err := w.deviceManagement.Register(c.Request().Context(), req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(200, dev)

}

func (w *Webhook) ConnectDevice(c echo.Context) error {

	client, err := w.deviceManagement.GetClient(c.Request().Context(), c.Param("client_id"))
	if err != nil && errors.Is(err, wa.ErrClientNotFound) {
		return c.JSON(http.StatusNotFound, DeviceConnectionResponse{ServerError: true, Message: err.Error()})
	}

	go w.whatsappClient.StartClient(c.Request().Context(), client)

	// wait for 5 seconds to connect
	time.Sleep(5 * time.Second)

	if w.whatsappClient.GetClient(c.Param("client_id")) == nil {
		return c.JSON(http.StatusInternalServerError, DeviceConnectionResponse{ServerError: true, Message: "Failed to connect to whatsapp"})
	} else {
		if w.whatsappClient.IsConnected(c.Param("client_id")) {
			return c.JSON(200, DeviceConnectionResponse{ServerError: false, Message: "Connected to whatsapp"})
		}
	}

	return c.JSON(http.StatusInternalServerError, DeviceConnectionResponse{ServerError: true, Message: "Failed to connect to whatsapp"})

}

func (w *Webhook) DisconnectDevice(c echo.Context) error {
	client, err := w.deviceManagement.GetClient(c.Request().Context(), c.Param("client_id"))
	if err != nil {
		return err
	}

	if ok, err := w.whatsappClient.DisconnectClient(client.ID); err != nil {
		return c.JSON(http.StatusInternalServerError, DeviceDisconnectionResponse{ServerError: true, Message: err.Error()})
	} else if ok {
		return c.JSON(200, DeviceDisconnectionResponse{ServerError: false, Message: "Disconnected from whatsapp"})
	}

	return c.JSON(http.StatusInternalServerError, DeviceDisconnectionResponse{ServerError: true, Message: "Failed to disconnect from whatsapp"})
}

func (w *Webhook) GetDevices(c echo.Context) error {
	clients, err := w.deviceManagement.GetClients(c.Request().Context())
	if err != nil {
		return err
	}

	return c.JSON(200, clients)
}

func (w *Webhook) ConnectionStatus(c echo.Context) error {
	var isConnected bool
	if w.whatsappClient.IsConnected(c.Param("client_id")) {
		isConnected = true
	}

	return c.JSON(200, ConnectionStatusResponse{
		IsConnected: isConnected,
	})
}

func (w *Webhook) GetClientQRC(c echo.Context) error {

	client, err := w.deviceManagement.GetClient(c.Request().Context(), c.Param("client_id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	if client.QrCode.String != "" {
		return c.JSON(200, QRCodeResponse{Code: client.QrCode.String})
	} else {
		if w.whatsappClient.IsConnected(c.Param("client_id")) {
			return c.JSON(200, QRCodeResponse{Code: "ALREADY_LOGGED_IN", IsConnected: true})
		}
		// Handle the case where QR Code is not found
		return c.JSON(404, GenericResponse{Message: "QR Code not found"})
	}
}

func (w *Webhook) SendMessage(c echo.Context) error {
	var message SendMessageRequest
	if err := c.Bind(&message); err != nil {
		return err
	}

	client, err := w.deviceManagement.GetClient(c.Request().Context(), message.ClientID)
	if errors.Is(err, wa.ErrClientNotFound) {
		return c.JSON(http.StatusNotFound, GenericResponse{Message: err.Error()})
	}

	err = w.whatsappClient.SendMessage(client.ID, message.MobileNumber, message.Text)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(200, GenericResponse{Message: "Message sent successfully"})
}
