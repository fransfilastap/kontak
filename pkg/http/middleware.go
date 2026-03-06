package http

import (
	"context"
	"os"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgtype"
	echoJwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type apiKeyUsageParams struct {
	ApiKeyID  pgtype.UUID
	Endpoint  string
	Method    pgtype.Text
	IpAddress pgtype.Text
}

// AppKeyAuthMiddleware checks for the app key in the request header and compares it with the token from the api_keys table
func AppKeyAuthMiddleware(queries db.Querier) echo.MiddlewareFunc {
	return middleware.KeyAuthWithConfig(middleware.KeyAuthConfig{
		KeyLookup: "header:X-API-Key",
		Validator: func(key string, c echo.Context) (bool, error) {
			// Get first 5 chars as prefix
			if len(key) < 5 {
				logger.Error("AppKeyAuthMiddleware: key too short")
				return false, nil
			}
			prefix := key[:5]

			// Look up key by prefix in api_keys table
			apiKey, err := queries.GetAPIKeyByPrefix(c.Request().Context(), prefix)
			if err != nil {
				logger.Error("AppKeyAuthMiddleware: failed to find key with prefix %s: %v", prefix, err)
				return false, nil
			}

			// Verify the key using constant-time comparison
			if !security.VerifyAPIKey(apiKey.KeyHash, key) {
				logger.Error("AppKeyAuthMiddleware: key verification failed for prefix %s", prefix)
				return false, nil
			}

			// Log the usage
			go func() {
				err := queries.LogAPIKeyUsage(context.Background(), db.LogAPIKeyUsageParams{
					ApiKeyID:  apiKey.ID,
					Endpoint:  c.Request().URL.Path,
					Method:    pgtype.Text{String: c.Request().Method, Valid: true},
					IpAddress: pgtype.Text{String: c.RealIP(), Valid: true},
				})
				if err != nil {
					logger.Error("AppKeyAuthMiddleware: failed to log usage: %v", err)
				}
			}()

			// Update last_used_at asynchronously
			go func() {
				err := queries.UpdateAPIKeyLastUsed(context.Background(), apiKey.ID)
				if err != nil {
					logger.Error("AppKeyAuthMiddleware: failed to update last_used: %v", err)
				}
			}()

			// Store userID in context
			c.Set("userID", apiKey.UserID)

			return true, nil
		},
	})
}

// JwtUserIDMiddleware extracts userID from JWT claims and sets it in the echo context,
// so getUserIDFromContext() works for JWT-authed routes.
func JwtUserIDMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := c.Get("user").(*jwt.Token)
			claims := token.Claims.(*security.CustomClaims)
			c.Set("userID", claims.UserID)
			return next(c)
		}
	}
}

func Jwt() echo.MiddlewareFunc {
	return echoJwt.WithConfig(echoJwt.Config{
		SigningKey: []byte(os.Getenv("JWT_SECRET")),
		ParseTokenFunc: func(c echo.Context, auth string) (interface{}, error) {
			keyFunc := func(t *jwt.Token) (interface{}, error) {
				return []byte(os.Getenv("JWT_SECRET")), nil
			}
			var claims security.CustomClaims
			token, err := jwt.ParseWithClaims(auth, &claims, keyFunc)
			if err != nil {
				return nil, err
			}

			return token, nil
		},
	})
}
