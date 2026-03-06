package http

import (
	"errors"
	"net/http"

	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/labstack/echo/v4"
)

type GroupHandler struct {
	device   *wa.DeviceStore
	waClient *wa.WhatsappClient
}

func NewGroupHandler(device *wa.DeviceStore, waClient *wa.WhatsappClient) *GroupHandler {
	return &GroupHandler{
		device:   device,
		waClient: waClient,
	}
}

// SyncJoinedGroup syncs joined groups from WhatsApp for a device
// @Summary Sync groups
// @Description Fetch and sync joined groups from WhatsApp for a device
// @Tags groups
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {object} map[string]string
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/groups/{client_id}/sync [put]
// @Security BearerAuth
func (g *GroupHandler) SyncJoinedGroup(c echo.Context) error {

	userID := getUserIDFromContext(c)
	clientID := c.Param("client_id")

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	if clientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Client ID is required"})
	}

	_, err := g.device.GetDeviceByIDAndUserID(c.Request().Context(), clientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	groups, err := g.waClient.GetJoinedGroups(clientID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	err = g.device.SyncJoinedGroups(c.Request().Context(), clientID, groups)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message": "Successfully synced joined groups",
	})
}

// GetJoinedGroups returns the list of joined groups for a device
// @Summary List groups
// @Description Get all joined groups for a device
// @Tags groups
// @Accept json
// @Produce json
// @Param client_id path string true "Device ID"
// @Success 200 {array} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/groups/{client_id} [get]
// @Security BearerAuth
func (g *GroupHandler) GetJoinedGroups(c echo.Context) error {
	userID := getUserIDFromContext(c)
	clientID := c.Param("client_id")

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	if clientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Client ID is required"})
	}

	_, err := g.device.GetDeviceByIDAndUserID(c.Request().Context(), clientID, userID)
	if err != nil && errors.Is(err, wa.ErrDeviceNotFound) {
		return c.JSON(http.StatusNotFound, ErrorResponse{Error: "Device not found"})
	}
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	groups, err := g.device.GetJoinedGroups(c.Request().Context(), clientID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, groups)
}
