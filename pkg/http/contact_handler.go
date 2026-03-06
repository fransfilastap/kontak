package http

import (
	"errors"
	"net/http"

	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/labstack/echo/v4"
)

type ContactHandler struct {
	device   *wa.DeviceStore
	waClient *wa.WhatsappClient
}

func NewContactHandler(device *wa.DeviceStore, waClient *wa.WhatsappClient) *ContactHandler {
	return &ContactHandler{
		device:   device,
		waClient: waClient,
	}
}

// SyncContacts syncs contacts from WhatsApp for a device
// @Summary Sync contacts
// @Description Fetch and sync contacts from WhatsApp for a device
// @Tags contacts
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/contacts/{client_id}/sync [put]
// @Security BearerAuth
func (h *ContactHandler) SyncContacts(c echo.Context) error {
	userID := getUserIDFromContext(c)
	clientID := c.Param("client_id")

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	if clientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Client ID is required"})
	}

	_, err := h.device.GetDeviceByIDAndUserID(c.Request().Context(), clientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	contacts, err := h.waClient.GetContacts(clientID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	err = h.device.SyncContacts(c.Request().Context(), clientID, contacts)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Successfully synced contacts",
	})
}

// GetContacts returns the list of contacts for a device
// @Summary List contacts
// @Description Get all contacts for a device
// @Tags contacts
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {array} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/contacts/{client_id} [get]
// @Security BearerAuth
func (h *ContactHandler) GetContacts(c echo.Context) error {
	userID := getUserIDFromContext(c)
	clientID := c.Param("client_id")

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	if clientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Client ID is required"})
	}

	_, err := h.device.GetDeviceByIDAndUserID(c.Request().Context(), clientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	contacts, err := h.device.GetContacts(c.Request().Context(), clientID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, contacts)
}
