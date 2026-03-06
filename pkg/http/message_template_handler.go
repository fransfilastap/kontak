package http

import (
	"encoding/json"
	"net/http"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

// MessageTemplateHandler handles API requests for message templates
type MessageTemplateHandler struct {
	db db.Querier
}

// NewMessageTemplateHandler creates a new MessageTemplateHandler
func NewMessageTemplateHandler(db db.Querier) *MessageTemplateHandler {
	return &MessageTemplateHandler{db: db}
}

// GetUserTemplates returns all message templates for the authenticated user
// @Summary List templates
// @Description Get all message templates for the authenticated user
// @Tags templates
// @Accept json
// @Produce json
// @Success 200 {array} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Router /admin/templates [get]
// @Security BearerAuth
func (h *MessageTemplateHandler) GetUserTemplates(c echo.Context) error {

	// Get user ID from context (set by auth middleware)
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	// Convert to pgtype.Int4
	pgUserID := pgtype.Int4{Int32: int32(userID), Valid: true}

	// Get templates from database
	templates, err := h.db.GetUserTemplates(c.Request().Context(), pgUserID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	// Ensure we return an empty array instead of null for empty results
	if templates == nil {
		templates = []db.MessageTemplate{}
	}

	return c.JSON(http.StatusOK, templates)
}

// @Summary Create template
// @Description Create a new message template
// @Tags templates
// @Accept json
// @Produce json
// @Param request body MessageTemplateRequest true "Template data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/templates [post]
// @Security BearerAuth
func (h *MessageTemplateHandler) CreateTemplate(c echo.Context) error {
	// Get user ID from context
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	// Bind request body
	var req MessageTemplateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	// Convert variables array to JSON bytes
	variablesBytes, err := json.Marshal(req.Variables)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to marshal variables: " + err.Error()})
	}

	// Create template in database
	template, err := h.db.CreateNewMessageTemplate(c.Request().Context(), db.CreateNewMessageTemplateParams{
		UserID:    pgtype.Int4{Int32: int32(userID), Valid: true},
		Name:      req.Name,
		Content:   req.Content,
		Variables: variablesBytes,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusCreated, template)
}

// @Summary Update template
// @Description Update an existing message template
// @Tags templates
// @Accept json
// @Produce json
// @Param id path string true "Template ID"
// @Param request body MessageTemplateRequest true "Template data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/templates/{id} [put]
// @Security BearerAuth
func (h *MessageTemplateHandler) UpdateTemplate(c echo.Context) error {
	// Get user ID from context
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	// Get template ID from URL
	templateID := c.Param("id")
	if templateID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Template ID is required"})
	}

	// Parse UUID
	var pgTemplateID pgtype.UUID
	if err := pgTemplateID.Scan(templateID); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid template ID"})
	}

	// Bind request body
	var req MessageTemplateRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
	}

	// Convert variables array to JSON bytes
	variablesBytes, err := json.Marshal(req.Variables)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to marshal variables: " + err.Error()})
	}

	// Update template in database
	template, err := h.db.UpdateMessageTemplate(c.Request().Context(), db.UpdateMessageTemplateParams{
		ID:        pgTemplateID,
		UserID:    pgtype.Int4{Int32: int32(userID), Valid: true},
		Name:      req.Name,
		Content:   req.Content,
		Variables: variablesBytes,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, template)
}

// @Summary Delete template
// @Description Delete a message template
// @Tags templates
// @Accept json
// @Produce json
// @Param id path string true "Template ID"
// @Success 204 {object} map[string]string
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/templates/{id} [delete]
// @Security BearerAuth
func (h *MessageTemplateHandler) DeleteTemplate(c echo.Context) error {
	// Get user ID from context
	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
	}

	// Get template ID from URL
	templateID := c.Param("id")
	if templateID == "" {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Template ID is required"})
	}

	// Parse UUID
	var pgTemplateID pgtype.UUID
	if err := pgTemplateID.Scan(templateID); err != nil {
		return c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid template ID"})
	}

	// Delete template from database
	err := h.db.DeleteMessageTemplate(c.Request().Context(), db.DeleteMessageTemplateParams{
		ID:     pgTemplateID,
		UserID: pgtype.Int4{Int32: int32(userID), Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
	}

	return c.JSON(http.StatusOK, GenericResponse{Message: "Template deleted successfully"})
}
