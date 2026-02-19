package http

import (
	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/labstack/echo/v4"
	"net/http"
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

func (h *ContactHandler) SyncContacts(c echo.Context) error {
	userID := getUserIDFromContext(c)
	clientID := c.Param("client_id")

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	if clientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Client ID is required"})
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

func (h *ContactHandler) GetContacts(c echo.Context) error {
	userID := getUserIDFromContext(c)
	clientID := c.Param("client_id")

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	if clientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Client ID is required"})
	}

	contacts, err := h.device.GetContacts(c.Request().Context(), clientID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, contacts)
}
