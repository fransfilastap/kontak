package http

import (
	"errors"
	"net/http"

	"github.com/fransfilastap/kontak/pkg/config"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	db  db.Querier
	cfg *config.Config // Unused field
}

func NewAuthHandler(db db.Querier, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg} // {{ edit_1 }}
}

// Login handles the login request.
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

func (w *AuthHandler) GenerateAPIKey(c echo.Context) error {

	username, err := GetUsernameFromToken(c)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error(), Context: "GetUsernameFromToken"})
	}

	user, err := w.db.GetUserByUsername(c.Request().Context(), username)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	apiKeyPrefix, err := security.GeneratePrefix()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	apiKey, err := security.GenerateAPIKey(apiKeyPrefix)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	_, err = w.db.SetUserAPIKey(c.Request().Context(), db.SetUserAPIKeyParams{
		ID:     user.ID,
		ApiKey: pgtype.Text{String: apiKey, Valid: true},
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, GenericResponse{Message: err.Error()})
	}

	err = w.db.SetUserAPIPrefix(c.Request().Context(), db.SetUserAPIPrefixParams{
		ID:           user.ID,
		ApiKeyPrefix: pgtype.Text{String: apiKeyPrefix, Valid: true},
	})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, GenericResponse{Message: err.Error()})
	}

	return c.JSON(200, GenerateAPIKeyResponse{APIKey: apiKey})
}
