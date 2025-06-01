package security

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/golang-jwt/jwt/v5"
)

type CustomClaims struct {
	Username string `json:"username"`
	UserID   int32  `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token for the given username (email) and user ID.
func GenerateToken(username string, userID int32) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, CustomClaims{
		Username: username,
		UserID:   userID,
	})

	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

// ValidateToken validates the given JWT token.
func ValidateToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil {
		log.Println("error parsing token", err)
		return "", fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(CustomClaims)
	if !ok || !token.Valid {
		log.Println("error parsing token ccc", err)
		return "", errors.New("invalid token")
	}
	username := claims.Username
	if !ok {
		return "", errors.New("invalid user ID in token")
	}

	return username, nil
}
