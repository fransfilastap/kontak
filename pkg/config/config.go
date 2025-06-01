package config

import (
	"os"
	"strconv"

	"github.com/fransfilastap/kontak/pkg/logger"
	"github.com/joho/godotenv"
)

type Config struct {
	Port              int
	Host              string
	DB                string
	JwtSecret         string
	InitUser          string
	InitPass          string
	LogLevel          string
	LogFileEnabled    bool
	LogFilePath       string
	LogFileMaxSize    int
	LogFileMaxBackups int
	LogFileMaxAge     int
	LogFileCompress   bool
}

func LoadConfig() *Config {

	err := godotenv.Load()
	if err != nil {
		logger.Warn("Error loading .env file")
	}

	port := os.Getenv("PORT")
	host := os.Getenv("HOST")
	db := os.Getenv("DB")
	jwtSecret := os.Getenv("JWT_SECRET")
	initUser := os.Getenv("INIT_USER")
	initPass := os.Getenv("INIT_PASS")
	logLevel := os.Getenv("LOG_LEVEL")

	if logLevel == "" {
		logLevel = "info" // Default log level
	}

	portInt, err := strconv.Atoi(port)
	if err != nil {
		portInt = 8080 // Default port
	}

	// Load log file configuration
	logFileEnabled := false
	logFileEnabledStr := os.Getenv("LOG_FILE_ENABLED")
	if logFileEnabledStr == "true" || logFileEnabledStr == "1" {
		logFileEnabled = true
	}

	logFilePath := os.Getenv("LOG_FILE_PATH")
	if logFilePath == "" {
		logFilePath = "logs/app.log" // Default log file path
	}

	logFileMaxSize := 100 // Default max size in MB
	logFileMaxSizeStr := os.Getenv("LOG_FILE_MAX_SIZE")
	if logFileMaxSizeStr != "" {
		if size, err := strconv.Atoi(logFileMaxSizeStr); err == nil {
			logFileMaxSize = size
		}
	}

	logFileMaxBackups := 3 // Default max backups
	logFileMaxBackupsStr := os.Getenv("LOG_FILE_MAX_BACKUPS")
	if logFileMaxBackupsStr != "" {
		if backups, err := strconv.Atoi(logFileMaxBackupsStr); err == nil {
			logFileMaxBackups = backups
		}
	}

	logFileMaxAge := 28 // Default max age in days
	logFileMaxAgeStr := os.Getenv("LOG_FILE_MAX_AGE")
	if logFileMaxAgeStr != "" {
		if age, err := strconv.Atoi(logFileMaxAgeStr); err == nil {
			logFileMaxAge = age
		}
	}

	logFileCompress := true // Default compression
	logFileCompressStr := os.Getenv("LOG_FILE_COMPRESS")
	if logFileCompressStr == "false" || logFileCompressStr == "0" {
		logFileCompress = false
	}

	return &Config{
		Port:              portInt,
		Host:              host,
		DB:                db,
		JwtSecret:         jwtSecret,
		InitUser:          initUser,
		InitPass:          initPass,
		LogLevel:          logLevel,
		LogFileEnabled:    logFileEnabled,
		LogFilePath:       logFilePath,
		LogFileMaxSize:    logFileMaxSize,
		LogFileMaxBackups: logFileMaxBackups,
		LogFileMaxAge:     logFileMaxAge,
		LogFileCompress:   logFileCompress,
	}
}
