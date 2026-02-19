package http

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

type DeviceHandler struct {
	whatsappClient   *wa.WhatsappClient
	deviceManagement *wa.DeviceStore
	db               db.Querier
}

func NewWebhook(whatsappClient *wa.WhatsappClient, management *wa.DeviceStore, db db.Querier) *DeviceHandler {
	return &DeviceHandler{whatsappClient: whatsappClient, deviceManagement: management, db: db}
}

// RegisterDevice registers a new WhatsApp device from the provided request data.
// It binds request data to the wa.Device struct, attempts to register the device with deviceManagement,
// and returns a JSON response with the registered device's information or an error message.
func (w *DeviceHandler) RegisterDevice(c echo.Context) error {
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

func (w *DeviceHandler) ConnectDevice(c echo.Context) error {
	client, err := w.deviceManagement.GetDeviceByID(c.Request().Context(), c.Param("client_id"))
	if err != nil && errors.Is(err, wa.ErrClientNotFound) {
		return c.JSON(http.StatusNotFound, DeviceConnectionResponse{ServerError: true, Message: err.Error()})
	}

	if client.Jid.String == "" {
		return c.JSON(http.StatusBadRequest, DeviceConnectionResponse{ServerError: true, Message: "Device is not paired. Please pair with QR code first."})
	}

	go w.whatsappClient.Start(context.Background(), client)

	// wait for 5 seconds to connect
	time.Sleep(5 * time.Second)

	if !w.whatsappClient.IsConnected(c.Param("client_id")) {
		return c.JSON(http.StatusInternalServerError, DeviceConnectionResponse{ServerError: true, Message: "Failed to connect to whatsapp. Make sure device is paired."})
	}

	return c.JSON(200, DeviceConnectionResponse{ServerError: false, Message: "Connected to whatsapp"})
}

func (w *DeviceHandler) DisconnectDevice(c echo.Context) error {
	client, err := w.deviceManagement.GetDeviceByID(c.Request().Context(), c.Param("client_id"))
	if err != nil {
		return err
	}

	if ok, err := w.whatsappClient.DisconnectDevice(client.ID); err != nil {
		return c.JSON(http.StatusInternalServerError, DeviceDisconnectionResponse{ServerError: true, Message: err.Error()})
	} else if ok {
		return c.JSON(200, DeviceDisconnectionResponse{ServerError: false, Message: "Disconnected from whatsapp"})
	}

	return c.JSON(http.StatusInternalServerError, DeviceDisconnectionResponse{ServerError: true, Message: "Failed to disconnect from whatsapp"})
}

func (w *DeviceHandler) GetDevices(c echo.Context) error {
	clients, err := w.deviceManagement.GetDevices(c.Request().Context())
	if err != nil {
		return err
	}

	return c.JSON(200, clients)
}

func (w *DeviceHandler) ConnectionStatus(c echo.Context) error {
	var isConnected bool
	if w.whatsappClient.IsConnected(c.Param("client_id")) {
		isConnected = true
	}

	return c.JSON(200, ConnectionStatusResponse{
		IsConnected: isConnected,
	})
}

func (w *DeviceHandler) GetDeviceQR(c echo.Context) error {

	client, err := w.deviceManagement.GetDeviceByID(c.Request().Context(), c.Param("client_id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	if w.whatsappClient.RetrieveDevice(client.ID) == nil {
		logger.Info("Device not running, starting client for QR generation: %s", client.ID)
		go w.whatsappClient.Start(context.Background(), client)
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

func (w *DeviceHandler) SendMessage(c echo.Context) error {
	var message SendMessageRequest
	if err := c.Bind(&message); err != nil {
		return err
	}

	client, err := w.deviceManagement.GetDeviceByID(c.Request().Context(), message.ClientID)
	if errors.Is(err, wa.ErrClientNotFound) {
		return c.JSON(http.StatusNotFound, GenericResponse{Message: err.Error()})
	}

	_, err = w.whatsappClient.SendMessage(client.ID, message.MobileNumber, message.Text)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(200, GenericResponse{Message: "Message sent successfully"})
}

func (w *DeviceHandler) SendMediaMessage(c echo.Context) error {

	err := c.Request().ParseMultipartForm(16 << 20) // 16MB
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Failed to parse multipart form")
	}

	var message SendMediaMessageRequest
	if err := c.Bind(&message); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Failed to bind request body")
	}

	if err := c.Validate(message); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	fileHeader, err := c.FormFile("media_url")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	file, err := fileHeader.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	_, err = w.whatsappClient.SendMediaMessage(message.ClientID, message.MobileNumber, fileBytes, fileHeader.Filename, fileHeader.Header.Get("Content-Type"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(200, GenericResponse{Message: "Message sent successfully"})
}

// SendTemplateMessage sends a message using a template
func (w *DeviceHandler) SendTemplateMessage(c echo.Context) error {
	var request SendTemplateMessageRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	// Get the device
	client, err := w.deviceManagement.GetDeviceByID(c.Request().Context(), request.DeviceID)
	if errors.Is(err, wa.ErrClientNotFound) {
		return c.JSON(http.StatusNotFound, GenericResponse{Message: "Device not found"})
	}

	// Parse template ID
	var templateID pgtype.UUID
	if err := templateID.Scan(request.TemplateID); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid template ID"})
	}

	// Get the template from database
	template, err := w.db.GetMessageTemplateByID(c.Request().Context(), templateID)
	if err != nil {
		return c.JSON(http.StatusNotFound, GenericResponse{Message: "Template not found"})
	}

	// Process the template with variables
	processedMessage := template.Content
	for key, value := range request.Variables {
		// Simple placeholder replacement
		placeholder := "{{" + key + "}}"
		processedMessage = strings.Replace(processedMessage, placeholder, fmt.Sprintf("%v", value), -1)
	}

	// Send the processed message
	_, err = w.whatsappClient.SendMessage(client.ID, request.To, processedMessage)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, GenericResponse{Message: "Template message sent successfully"})
}

func (w *DeviceHandler) DeleteDevice(c echo.Context) error {
	client, err := w.deviceManagement.GetDeviceByID(c.Request().Context(), c.Param("client_id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	if success, err := w.whatsappClient.DisconnectDevice(client.Jid.String); !success {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	_, err = w.deviceManagement.DeleteClient(c.Request().Context(), c.Param("client_id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(200, GenericResponse{Message: "Successfully disconnected from whatsapp"})

}
