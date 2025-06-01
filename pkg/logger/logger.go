package logger

import (
	"fmt"
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	// DefaultLogger is the default logger instance
	DefaultLogger Logger
)

// LogLevel represents the level of logging
type LogLevel int8

const (
	// DebugLevel defines debug log level
	DebugLevel LogLevel = iota
	// InfoLevel defines info log level
	InfoLevel
	// WarnLevel defines warn log level
	WarnLevel
	// ErrorLevel defines error log level
	ErrorLevel
	// FatalLevel defines fatal log level
	FatalLevel
	// PanicLevel defines panic log level
	PanicLevel
	// NoLevel defines no log level
	NoLevel
	// Disabled disables the logger
	Disabled
)

// Logger is the interface for logging
type Logger interface {
	Debug(msg string, args ...interface{})
	Info(msg string, args ...interface{})
	Warn(msg string, args ...interface{})
	Error(msg string, args ...interface{})
	Fatal(msg string, args ...interface{})
	WithField(key string, value interface{}) Logger
	WithFields(fields map[string]interface{}) Logger
	WithError(err error) Logger
}

// ZerologLogger implements the Logger interface using zerolog
type ZerologLogger struct {
	logger zerolog.Logger
}

// Config represents the configuration for the logger
type Config struct {
	// Level is the log level
	Level LogLevel
	// Output is the output writer
	Output io.Writer
	// TimeFormat is the time format for the logger
	TimeFormat string
	// NoColor disables the color output
	NoColor bool
	// EnableFileLogging enables logging to a file
	EnableFileLogging bool
	// LogFilePath is the path to the log file
	LogFilePath string
	// MaxSize is the maximum size in megabytes of the log file before it gets rotated
	MaxSize int
	// MaxBackups is the maximum number of old log files to retain
	MaxBackups int
	// MaxAge is the maximum number of days to retain old log files
	MaxAge int
	// Compress determines if the rotated log files should be compressed using gzip
	Compress bool
}

// DefaultConfig returns the default configuration for the logger
func DefaultConfig() Config {
	return Config{
		Level:             InfoLevel,
		Output:            os.Stdout,
		TimeFormat:        time.RFC3339,
		NoColor:           false,
		EnableFileLogging: false,
		LogFilePath:       "logs/app.log",
		MaxSize:           100,
		MaxBackups:        3,
		MaxAge:            28,
		Compress:          true,
	}
}

// Init initializes the logger with the given configuration
func Init(config Config) {
	zerolog.TimeFieldFormat = config.TimeFormat
	zerolog.SetGlobalLevel(zerolog.Level(config.Level))

	var output io.Writer = config.Output
	if !config.NoColor && config.Output == os.Stdout {
		output = zerolog.ConsoleWriter{
			Out:        config.Output,
			TimeFormat: config.TimeFormat,
		}
	}

	// Setup file logging if enabled
	if config.EnableFileLogging {
		// Ensure directory exists
		if err := os.MkdirAll(config.LogFilePath[:len(config.LogFilePath)-len("/"+getFileName(config.LogFilePath))], 0755); err != nil {
			fmt.Printf("ERROR: Failed to create log directory: %v\n", err)
		}

		// Configure lumberjack for log rotation
		fileLogger := &lumberjack.Logger{
			Filename:   config.LogFilePath,
			MaxSize:    config.MaxSize,
			MaxBackups: config.MaxBackups,
			MaxAge:     config.MaxAge,
			Compress:   config.Compress,
		}

		// If we're already using console output, create a multi-writer
		if config.Output == os.Stdout {
			output = io.MultiWriter(output, fileLogger)
		} else {
			output = fileLogger
		}
	}

	logger := zerolog.New(output).With().Timestamp().Logger()
	DefaultLogger = &ZerologLogger{logger: logger}
}

// getFileName extracts the filename from a path
func getFileName(path string) string {
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' {
			return path[i+1:]
		}
	}
	return path
}

// Debug logs a debug message
func (l *ZerologLogger) Debug(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Debug().Msgf(msg, args...)
	} else {
		l.logger.Debug().Msg(msg)
	}
}

// Info logs an info message
func (l *ZerologLogger) Info(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Info().Msgf(msg, args...)
	} else {
		l.logger.Info().Msg(msg)
	}
}

// Warn logs a warning message
func (l *ZerologLogger) Warn(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Warn().Msgf(msg, args...)
	} else {
		l.logger.Warn().Msg(msg)
	}
}

// Error logs an error message
func (l *ZerologLogger) Error(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Error().Msgf(msg, args...)
	} else {
		l.logger.Error().Msg(msg)
	}
}

// Fatal logs a fatal message and exits
func (l *ZerologLogger) Fatal(msg string, args ...interface{}) {
	if len(args) > 0 {
		l.logger.Fatal().Msgf(msg, args...)
	} else {
		l.logger.Fatal().Msg(msg)
	}
}

// WithField returns a new logger with the given field
func (l *ZerologLogger) WithField(key string, value interface{}) Logger {
	return &ZerologLogger{
		logger: l.logger.With().Interface(key, value).Logger(),
	}
}

// WithFields returns a new logger with the given fields
func (l *ZerologLogger) WithFields(fields map[string]interface{}) Logger {
	ctx := l.logger.With()
	for k, v := range fields {
		ctx = ctx.Interface(k, v)
	}
	return &ZerologLogger{
		logger: ctx.Logger(),
	}
}

// WithError returns a new logger with the given error
func (l *ZerologLogger) WithError(err error) Logger {
	return &ZerologLogger{
		logger: l.logger.With().Err(err).Logger(),
	}
}

// Debug logs a debug message using the default logger
func Debug(msg string, args ...interface{}) {
	if DefaultLogger == nil {
		fmt.Printf("DEBUG: "+msg+"\n", args...)
		return
	}
	DefaultLogger.Debug(msg, args...)
}

// Info logs an info message using the default logger
func Info(msg string, args ...interface{}) {
	if DefaultLogger == nil {
		fmt.Printf("INFO: "+msg+"\n", args...)
		return
	}
	DefaultLogger.Info(msg, args...)
}

// Warn logs a warning message using the default logger
func Warn(msg string, args ...interface{}) {
	if DefaultLogger == nil {
		fmt.Printf("WARN: "+msg+"\n", args...)
		return
	}
	DefaultLogger.Warn(msg, args...)
}

// Error logs an error message using the default logger
func Error(msg string, args ...interface{}) {
	if DefaultLogger == nil {
		fmt.Printf("ERROR: "+msg+"\n", args...)
		return
	}
	DefaultLogger.Error(msg, args...)
}

// Fatal logs a fatal message and exits using the default logger
func Fatal(msg string, args ...interface{}) {
	if DefaultLogger == nil {
		fmt.Printf("FATAL: "+msg+"\n", args...)
		os.Exit(1)
		return
	}
	DefaultLogger.Fatal(msg, args...)
}

// WithField returns a new logger with the given field using the default logger
func WithField(key string, value interface{}) Logger {
	if DefaultLogger == nil {
		Init(DefaultConfig())
	}
	return DefaultLogger.WithField(key, value)
}

// WithFields returns a new logger with the given fields using the default logger
func WithFields(fields map[string]interface{}) Logger {
	if DefaultLogger == nil {
		Init(DefaultConfig())
	}
	return DefaultLogger.WithFields(fields)
}

// WithError returns a new logger with the given error using the default logger
func WithError(err error) Logger {
	if DefaultLogger == nil {
		Init(DefaultConfig())
	}
	return DefaultLogger.WithError(err)
}
