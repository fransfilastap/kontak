package security

import (
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// GenerateHash generates a hash for the given password using bcrypt.
func GenerateHash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(password)), 14)
	if err != nil {
		return "", err // Handle error
	}
	return string(hash), nil // Convert []byte to string
}

// CompareHash compares a given password with a stored hash using bcrypt.
func CompareHash(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(strings.TrimSpace(hash)), []byte(strings.TrimSpace(password))) == nil
}
