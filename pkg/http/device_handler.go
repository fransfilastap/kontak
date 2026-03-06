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
	whatsappClient    *wa.WhatsappClient
	deviceManagement  *wa.DeviceStore
	db                db.Querier
	subscriptionStore *wa.SubscriptionStore
}

func NewWebhook(whatsappClient *wa.WhatsappClient, management *wa.DeviceStore, db db.Querier, subscriptionStore *wa.SubscriptionStore) *DeviceHandler {
	return &DeviceHandler{whatsappClient: whatsappClient, deviceManagement: management, db: db, subscriptionStore: subscriptionStore}
}

// RegisterDevice registers a new WhatsApp device from the provided request data.
// It binds request data to the wa.Device struct, attempts to register the device with deviceManagement,
// and returns a JSON response with the registered device's information or an error message.
// @Summary Register device
// @Description Register a new WhatsApp device
// @Tags devices
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "Device data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/clients [post]
// @Security BearerAuth
func (w *DeviceHandler) RegisterDevice(c echo.Context) error {
	userID := getUserIDFromContext(c)

	var req wa.Device
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, ErrorResponse{
			Error: err.Error(),
		})
	}

	dev, err := w.deviceManagement.Register(c.Request().Context(), req, userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(200, dev)

}

// @Summary Connect device
// @Description Connect to a WhatsApp device
// @Tags devices
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {object} DeviceConnectionResponse
// @Failure 400 {object} DeviceConnectionResponse
// @Failure 401 {object} DeviceConnectionResponse
// @Failure 404 {object} DeviceConnectionResponse
// @Router /admin/clients/{client_id}/connect [post]
// @Security BearerAuth
func (w *DeviceHandler) ConnectDevice(c echo.Context) error {
	userID := getUserIDFromContext(c)

	client, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), c.Param("client_id"), userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, DeviceConnectionResponse{ServerError: true, Message: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, DeviceConnectionResponse{ServerError: true, Message: err.Error()})
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

// @Summary Disconnect device
// @Description Disconnect from a WhatsApp device
// @Tags devices
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {object} DeviceConnectionResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/clients/{client_id}/disconnect [delete]
// @Security BearerAuth
func (w *DeviceHandler) DisconnectDevice(c echo.Context) error {
	userID := getUserIDFromContext(c)

	client, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), c.Param("client_id"), userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, DeviceDisconnectionResponse{ServerError: true, Message: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, DeviceDisconnectionResponse{ServerError: true, Message: err.Error()})
	}

	if ok, err := w.whatsappClient.DisconnectDevice(client.ID); err != nil {
		return c.JSON(http.StatusInternalServerError, DeviceDisconnectionResponse{ServerError: true, Message: err.Error()})
	} else if ok {
		return c.JSON(200, DeviceDisconnectionResponse{ServerError: false, Message: "Disconnected from whatsapp"})
	}

	return c.JSON(http.StatusInternalServerError, DeviceDisconnectionResponse{ServerError: true, Message: "Failed to disconnect from whatsapp"})
}

// @Summary List devices
// @Description Get all devices for the authenticated user
// @Tags devices
// @Accept json
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Router /admin/clients [get]
// @Security BearerAuth
func (w *DeviceHandler) GetDevices(c echo.Context) error {
	userID := getUserIDFromContext(c)

	clients, err := w.deviceManagement.GetDevicesByUserID(c.Request().Context(), userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(200, clients)
}

// @Summary Get connection status
// @Description Get the connection status of a device
// @Tags devices
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/clients/{client_id}/status [get]
// @Security BearerAuth
func (w *DeviceHandler) ConnectionStatus(c echo.Context) error {
	userID := getUserIDFromContext(c)

	_, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), c.Param("client_id"), userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	var isConnected bool
	if w.whatsappClient.IsConnected(c.Param("client_id")) {
		isConnected = true
	}

	return c.JSON(200, ConnectionStatusResponse{
		IsConnected: isConnected,
	})
}

// @Summary Get QR code
// @Description Get QR code for device pairing
// @Tags devices
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/clients/{client_id}/qr [get]
// @Security BearerAuth
func (w *DeviceHandler) GetDeviceQR(c echo.Context) error {
	userID := getUserIDFromContext(c)

	client, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), c.Param("client_id"), userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
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

// @Summary Send message
// @Description Send a text message via WhatsApp
// @Tags messages
// @Accept json
// @Produce json
// @Param request body SendMessageRequest true "Message data"
// @Success 200 {object} SendMessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /v1/chats [post]
// @Security ApiKeyAuth
func (w *DeviceHandler) SendMessage(c echo.Context) error {
	var message SendMessageRequest
	if err := c.Bind(&message); err != nil {
		return err
	}

	userID := getUserIDFromContext(c)

	client, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), message.ClientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, GenericResponse{Message: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	_, err = w.whatsappClient.SendMessage(client.ID, message.MobileNumber, message.Text)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(200, GenericResponse{Message: "Message sent successfully"})
}

// @Summary Send media message
// @Description Send a media message via WhatsApp
// @Tags messages
// @Accept multipart/form-data
// @Produce json
// @Param client_id formData string true "Client ID"
// @Param mobile_number formData string true "Mobile number"
// @Param media_url formData file true "Media file"
// @Param caption formData string false "Caption"
// @Success 200 {object} GenericResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /v1/chats/media [post]
// @Security ApiKeyAuth
func (w *DeviceHandler) SendMediaMessage(c echo.Context) error {
	userID := getUserIDFromContext(c)

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

	_, err = w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), message.ClientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, GenericResponse{Message: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}

	fileHeader, err := c.FormFile("media_url")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "File is required")
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
// @Summary Send template message
// @Description Send a message using a template
// @Tags messages
// @Accept json
// @Produce json
// @Param request body SendTemplateMessageRequest true "Template message data"
// @Success 200 {object} GenericResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /v1/chats/template [post]
// @Security ApiKeyAuth
func (w *DeviceHandler) SendTemplateMessage(c echo.Context) error {
	userID := getUserIDFromContext(c)

	var request SendTemplateMessageRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	// Get the device with ownership check
	client, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), request.DeviceID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, GenericResponse{Message: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
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
	userID := getUserIDFromContext(c)

	client, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), c.Param("client_id"), userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
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

type SubscriptionRequest struct {
	Subscriptions map[string]bool `json:"subscriptions"`
}

// @Summary Get device subscriptions
// @Description Get event subscriptions for a device
// @Tags devices
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {object} map[string]bool
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/clients/{client_id}/subscriptions [get]
// @Security BearerAuth
func (w *DeviceHandler) GetDeviceSubscriptions(c echo.Context) error {
	userID := getUserIDFromContext(c)

	_, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), c.Param("client_id"), userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	subscriptions := w.subscriptionStore.GetDeviceSubscriptions(c.Param("client_id"))

	availableEvents := make(map[string]bool)
	for _, eventType := range wa.DefaultEventTypes {
		if enabled, exists := subscriptions[eventType]; exists {
			availableEvents[eventType] = enabled
		} else {
			availableEvents[eventType] = true
		}
	}

	return c.JSON(200, availableEvents)
}

// @Summary Update device subscriptions
// @Description Update event subscriptions for a device
// @Tags devices
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Param request body SubscriptionRequest true "Subscriptions data"
// @Success 200 {object} GenericResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/clients/{client_id}/subscriptions [put]
// @Security BearerAuth
func (w *DeviceHandler) UpdateDeviceSubscriptions(c echo.Context) error {
	userID := getUserIDFromContext(c)

	_, err := w.deviceManagement.GetDeviceByIDAndUserID(c.Request().Context(), c.Param("client_id"), userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	var req SubscriptionRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(400, ErrorResponse{Error: err.Error()})
	}

	err = w.subscriptionStore.SetDeviceSubscriptions(c.Request().Context(), c.Param("client_id"), req.Subscriptions)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(200, GenericResponse{Message: "Subscriptions updated successfully"})
}
