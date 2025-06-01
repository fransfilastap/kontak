package webhook

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

// Server represents the server configuration.
type Server struct {
	httpServer             *http.Server
	webhookHandler         *Webhook
	authHandler            *AuthHandler
	messageTemplateHandler *MessageTemplateHandler
	db                     db.Querier
}

// NewServer initializes a new Server instance.
func NewServer(addr string, webhook *Webhook, authHandler *AuthHandler, db db.Querier) *Server {
	messageTemplateHandler := NewMessageTemplateHandler(db)
	return &Server{
		httpServer: &http.Server{
			Addr:    addr,
			Handler: createEchoServer(webhook, authHandler, messageTemplateHandler, db),
		},
		webhookHandler:         webhook,
		authHandler:            authHandler,
		messageTemplateHandler: messageTemplateHandler,
		db:                     db,
	}
}

// createEchoServer sets up the Echo server with middleware.
func createEchoServer(webhook *Webhook, authHandler *AuthHandler, messageTemplateHandler *MessageTemplateHandler, db db.Querier) *echo.Echo {
	e := echo.New()

	// Middleware configuration
	e.Use(middleware.Logger())
	e.Use(middleware.CORS())
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Recover())
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(
		rate.Limit(20),
	)))

	// Separate function for routes configuration
	registerRoutes(e, webhook, authHandler, messageTemplateHandler, db)

	return e
}

// registerRoutes sets up the routes for the Echo server.
// It configures the following endpoints:
// - GET /client/qr: Handles requests to retrieve a QR code using the SendQrHandler method of the ConnectionHandler.
// - GET /: Handles requests to the root path using the Index method of the ConnectionHandler.
// - POST /webhook: Handles webhook events using the SendMessage method of the Webhook.
func registerRoutes(e *echo.Echo, webhook *Webhook, authHandler *AuthHandler, messageTemplateHandler *MessageTemplateHandler, db db.Querier) {

	e.POST("/login", authHandler.Login)

	admin := e.Group("/admin", Jwt())

	//v1.GET("/users", authHandler.GetUsers)
	admin.POST("/users", authHandler.Register)
	admin.POST("/users/api-key", authHandler.GenerateAPIKey)
	admin.POST("/clients", webhook.RegisterDevice)
	admin.GET("/clients", webhook.GetDevices)
	admin.POST("/clients/:client_id/connect", webhook.ConnectDevice)
	admin.DELETE("/clients/:client_id/disconnect", webhook.DisconnectDevice)
	admin.GET("/clients/:client_id/qr", webhook.GetClientQRC)
	admin.GET("/clients/:client_id/status", webhook.ConnectionStatus)

	// Message Templates
	admin.GET("/templates", messageTemplateHandler.GetUserTemplates)
	admin.POST("/templates", messageTemplateHandler.CreateTemplate)
	admin.PUT("/templates/:id", messageTemplateHandler.UpdateTemplate)
	admin.DELETE("/templates/:id", messageTemplateHandler.DeleteTemplate)

	// API Key
	v1 := e.Group("/v1", AppKeyAuthMiddleware(db))
	v1.POST("/chats", webhook.SendMessage)
	v1.POST("/chats/template", webhook.SendTemplateMessage)

}

// Start launches the server and begins listening for incoming HTTP requests.
// It uses the Address specified in the httpServer configuration.
// If the server cannot start, it logs a fatal error including the address
// and the error message.
func (s *Server) Start() {
	if err := s.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Could not listen on %s: %v\n", s.httpServer.Addr, err)
	}
	log.Printf("Server is ready to handle requests at %s", s.httpServer.Addr)
}

// Shutdown gracefully shuts down the server without interrupting any active connections.
// It takes a context.Context parameter which can be used to set a deadline or cancel
// the shutdown operation. If the shutdown is successful, it returns nil. If there is
// an error during the shutdown process, it returns an error wrapped with additional context.
func (s *Server) Shutdown(ctx context.Context) error {
	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("could not gracefully shutdown the server: %w", err)
	}
	log.Println("Server shut down successfully")
	return nil
}
