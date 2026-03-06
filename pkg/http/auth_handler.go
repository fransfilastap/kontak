package http

import (
	"errors"
	"net/http"

	"github.com/fransfilastap/kontak/pkg/config"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

// @title Kontak API
// @version 1.0
// @description WhatsApp-to-REST-API bridge
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url https://github.com/fransfilastap/kontak
// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
// @description API Key authentication for v1 endpoints

type AuthHandler struct {
	db  db.Querier
	cfg *config.Config // Unused field
}

func NewAuthHandler(db db.Querier, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg} // {{ edit_1 }}
}

// Login handles the login request.
// @Summary Login user
// @Description Authenticate user and get JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} LoginResponse
// @Failure 401 {object} map[string]string
// @Router /login [post]
func (w *AuthHandler) Login(c echo.Context) error {
	var request LoginRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	user, err := w.db.GetUserByUsername(c.Request().Context(), request.Email)
	if err != nil && errors.Is(err, pgx.ErrNoRows) {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "invalid credentials"})
	}

	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	if !security.CompareHash(user.Password, request.Password) {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "invalid credentials #2"})
	}

	token, err := security.GenerateToken(request.Email, user.ID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	response := LoginResponse{Token: token}
	return c.JSON(http.StatusOK, response)
}

// @Summary Register new user
// @Description Create a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /admin/users [post]
// @Security BearerAuth
func (w *AuthHandler) Register(c echo.Context) error {
	var request RegisterRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	hash, err := security.GenerateHash(request.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	_, err = w.db.CreateUser(c.Request().Context(), db.CreateUserParams{
		Email:    request.Email,
		Password: hash,
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	response := RegisterResponse{Message: "User created successfully"}
	return c.JSON(http.StatusOK, response)
}

// GenerateAPIKey generates a new API key for the user (legacy single key)
// @Summary Generate API key
// @Description Generate a new API key for the user (legacy endpoint, prefer /api-keys)
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} GenerateAPIKeyResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/users/api-key [post]
// @Security BearerAuth
func (w *AuthHandler) GenerateAPIKey(c echo.Context) error {
	userID := getUserIDFromContext(c)
	logger.Info("GenerateAPIKey: userID=%d", userID)

	if userID == 0 {
		logger.Error("GenerateAPIKey: unauthorized userID=0")
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}

	apiKeyPrefix, err := security.GeneratePrefix()
	if err != nil {
		logger.Error("GenerateAPIKey: failed to generate prefix: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	apiKey, err := security.GenerateAPIKey(apiKeyPrefix)
	if err != nil {
		logger.Error("GenerateAPIKey: failed to generate API key: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	_, err = w.db.SetUserAPIKey(c.Request().Context(), db.SetUserAPIKeyParams{
		ID:     userID,
		ApiKey: pgtype.Text{String: apiKey, Valid: true},
	})

	if err != nil {
		logger.Error("GenerateAPIKey: failed to set API key in DB: %v", err)
		return c.JSON(http.StatusInternalServerError, GenericResponse{Message: err.Error()})
	}

	err = w.db.SetUserAPIPrefix(c.Request().Context(), db.SetUserAPIPrefixParams{
		ID:           userID,
		ApiKeyPrefix: pgtype.Text{String: apiKeyPrefix, Valid: true},
	})
	if err != nil {
		logger.Error("GenerateAPIKey: failed to set API key prefix: %v", err)
		return c.JSON(http.StatusInternalServerError, GenericResponse{Message: err.Error()})
	}

	logger.Info("GenerateAPIKey: success for userID=%d prefix=%s", userID, apiKeyPrefix)
	return c.JSON(200, GenerateAPIKeyResponse{APIKey: apiKey})
}

type CreateAPIKeyRequest struct {
	Name string `json:"name" validate:"required"`
}

type APIKeyResponse struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	KeyPrefix  string `json:"key_prefix"`
	CreatedAt  string `json:"created_at"`
	LastUsedAt string `json:"last_used_at"`
	IsActive   bool   `json:"is_active"`
	APIKey     string `json:"api_key,omitempty"`
}

// ListAPIKeys returns all API keys for the authenticated user
// @Summary List API keys
// @Description Get all API keys for the authenticated user
// @Tags api-keys
// @Accept json
// @Produce json
// @Success 200 {array} APIKeyResponse
// @Failure 401 {object} map[string]string
// @Router /admin/users/api-keys [get]
// @Security BearerAuth
func (w *AuthHandler) ListAPIKeys(c echo.Context) error {
	userID := getUserIDFromContext(c)
	logger.Info("ListAPIKeys: userID=%d", userID)

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}

	keys, err := w.db.GetAPIKeysByUserID(c.Request().Context(), userID)
	if err != nil {
		logger.Error("ListAPIKeys: failed to fetch keys: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	response := make([]APIKeyResponse, len(keys))
	for i, key := range keys {
		response[i] = APIKeyResponse{
			ID:         key.ID.String(),
			Name:       key.Name,
			KeyPrefix:  key.KeyPrefix,
			CreatedAt:  key.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			LastUsedAt: key.LastUsedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
			IsActive:   key.IsActive.Bool,
		}
	}

	return c.JSON(http.StatusOK, response)
}

// CreateAPIKey creates a new API key for the authenticated user
// @Summary Create API key
// @Description Create a new API key for the authenticated user
// @Tags api-keys
// @Accept json
// @Produce json
// @Param request body CreateAPIKeyRequest true "API key name"
// @Success 201 {object} APIKeyResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /admin/users/api-keys [post]
// @Security BearerAuth
func (w *AuthHandler) CreateAPIKey(c echo.Context) error {
	userID := getUserIDFromContext(c)
	logger.Info("CreateAPIKey: userID=%d", userID)

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}

	// Check max 5 keys per user
	existingKeys, err := w.db.GetAPIKeysByUserID(c.Request().Context(), userID)
	if err != nil {
		logger.Error("CreateAPIKey: failed to check existing keys: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	if len(existingKeys) >= 5 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Maximum 5 API keys per user"})
	}

	var req CreateAPIKeyRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Name is required"})
	}

	apiKeyPrefix, err := security.GeneratePrefix()
	if err != nil {
		logger.Error("CreateAPIKey: failed to generate prefix: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	apiKey, err := security.GenerateAPIKey(apiKeyPrefix)
	if err != nil {
		logger.Error("CreateAPIKey: failed to generate API key: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	key, err := w.db.CreateAPIKey(c.Request().Context(), db.CreateAPIKeyParams{
		UserID:    userID,
		Name:      req.Name,
		KeyHash:   apiKey,
		KeyPrefix: apiKeyPrefix,
	})
	if err != nil {
		logger.Error("CreateAPIKey: failed to create key: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	logger.Info("CreateAPIKey: success for userID=%d keyID=%s name=%s", userID, key.ID.String(), req.Name)

	response := APIKeyResponse{
		ID:         key.ID.String(),
		Name:       key.Name,
		KeyPrefix:  key.KeyPrefix,
		CreatedAt:  key.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
		LastUsedAt: key.LastUsedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
		IsActive:   key.IsActive.Bool,
		APIKey:     apiKey, // Only returned on creation
	}

	return c.JSON(http.StatusCreated, response)
}

// DeleteAPIKey deletes an API key
// @Summary Delete API key
// @Description Delete an API key by ID
// @Tags api-keys
// @Accept json
// @Produce json
// @Param id path string true "API Key ID"
// @Success 204 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /admin/users/api-keys/{id} [delete]
// @Security BearerAuth
func (w *AuthHandler) DeleteAPIKey(c echo.Context) error {
	userID := getUserIDFromContext(c)
	keyID := c.Param("id")

	logger.Info("DeleteAPIKey: userID=%d keyID=%s", userID, keyID)

	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, echo.Map{"error": "unauthorized"})
	}

	parsedKeyID, err := uuid.Parse(keyID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Invalid key ID"})
	}

	// Verify ownership
	key, err := w.db.GetAPIKeyByID(c.Request().Context(), pgtype.UUID{Bytes: parsedKeyID, Valid: true})
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "API key not found"})
	}

	if key.UserID != userID {
		return c.JSON(http.StatusForbidden, echo.Map{"error": "Not authorized to delete this key"})
	}

	err = w.db.DeleteAPIKey(c.Request().Context(), pgtype.UUID{Bytes: parsedKeyID, Valid: true})
	if err != nil {
		logger.Error("DeleteAPIKey: failed to delete: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	logger.Info("DeleteAPIKey: success for userID=%d keyID=%s", userID, keyID)
	return c.JSON(http.StatusOK, echo.Map{"message": "API key deleted successfully"})
}
