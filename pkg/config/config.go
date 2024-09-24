package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port      int
	Host      string
	DB        string
	JwtSecret string
	InitUser  string
	InitPass  string
}

func LoadConfig() *Config {

	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env.example file")
	}

	port := os.Getenv("PORT")
	host := os.Getenv("HOST")
	db := os.Getenv("DB")
	jwtSecret := os.Getenv("JWT_SECRET")
	initUser := os.Getenv("INIT_USER")
	initPass := os.Getenv("INIT_PASS")

	portInt, err := strconv.Atoi(port)
	if err != nil {
		portInt = 8080 // Default port
	}

	return &Config{
		Port:      portInt,
		Host:      host,
		DB:        db,
		JwtSecret: jwtSecret,
		InitUser:  initUser,
		InitPass:  initPass,
	}
}
