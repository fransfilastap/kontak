package webhook

import (
	"os"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgtype"
	echoJwt "github.com/labstack/echo-jwt/v4"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// AppKeyAuthMiddleware checks for the app key in the request header and compares it with the token from the client table
func AppKeyAuthMiddleware(db db.Querier) echo.MiddlewareFunc {
	return middleware.KeyAuthWithConfig(middleware.KeyAuthConfig{
		KeyLookup: "header:X-API-Key",
		Validator: func(key string, c echo.Context) (bool, error) {
			client, err := db.GetUserByAPIKey(c.Request().Context(), pgtype.Text{String: key, Valid: true})
			if err != nil {
				return false, err
			}
			return client.ApiKey.String == key, nil
		},
	})
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
