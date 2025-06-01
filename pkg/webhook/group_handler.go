package webhook

import (
	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/labstack/echo/v4"
	"net/http"
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

func (g *GroupHandler) SyncJoinedGroup(c echo.Context) error {

	userID := getUserIDFromContext(c)
	clientID := c.Param("client_id")

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	if clientID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Client ID is required"})
	}

	groups, err := g.waClient.GetJoinedGroups(clientID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	err = g.device.SyncJoinedGroups(c.Request().Context(), clientID, groups)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, groups)
}
