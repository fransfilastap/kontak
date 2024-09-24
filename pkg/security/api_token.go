// Package security provides functions for generating, hashing, and comparing API keys.
package security

import (
	"crypto/rand"
	"encoding/base64"
	"math/big"
)

// generatePrefix creates a random 5-letter prefix for API keys.
// It returns the generated prefix as a string and any error encountered.
func GeneratePrefix() (string, error) {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	prefix := make([]byte, 5)
	for i := range prefix {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return "", err
		}
		prefix[i] = letters[n.Int64()]
	}
	return string(prefix), nil
}

// GenerateAPIKey creates a new API key with the given prefix.
// It returns the generated API key as a string and any error encountered.
func GenerateAPIKey(prefix string) (string, error) {
	key := make([]byte, 32)
	_, err := rand.Read(key)
	if err != nil {
		return "", err
	}
	return prefix + base64.StdEncoding.EncodeToString(key), nil
}

// GenerateAPIKeyWithPrefix creates a new API key with a randomly generated prefix.
// It returns the generated API key as a string and any error encountered.
func GenerateAPIKeyWithPrefix() (string, error) {
	prefix, err := GeneratePrefix()
	if err != nil {
		return "", err
	}
	return GenerateAPIKey(prefix)
}
