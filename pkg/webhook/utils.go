package webhook

import (
	"os"
	"strings"

	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

// GetUsernameFromToken extracts the username from the JWT token in the Authorization header
func GetUsernameFromToken(c echo.Context) (string, error) {
	auth, err := GetTokenFromHeader(c)
	if err != nil {
		return "", err
	}
	keyFunc := func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	}
	var claims security.CustomClaims
	_, err = jwt.ParseWithClaims(auth, &claims, keyFunc)
	if err != nil {
		return "", err
	}

	return claims.Username, nil
}

func GetTokenFromHeader(c echo.Context) (string, error) {
	auth := c.Request().Header.Get("Authorization")
	auth = strings.TrimPrefix(auth, "Bearer ")
	return auth, nil
}
