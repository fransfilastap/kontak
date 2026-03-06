package http

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/go-playground/validator/v10"

	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/wa"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
)

// Server represents the server configuration.
type Server struct {
	httpServer             *http.Server
	webhookHandler         *DeviceHandler
	authHandler            *AuthHandler
	messageTemplateHandler *MessageTemplateHandler
	groupHandler           *GroupHandler
	contactHandler         *ContactHandler
	inboxHandler           *InboxHandler
	broadcastHandler       *BroadcastHandler
	db                     db.Querier
	subscriptionStore      *wa.SubscriptionStore
}

// NewServer initializes a new Server instance.
func NewServer(addr string, webhook *DeviceHandler, authHandler *AuthHandler, groupHandler *GroupHandler, contactHandler *ContactHandler, inboxHandler *InboxHandler, broadcastHandler *BroadcastHandler, db db.Querier, subscriptionStore *wa.SubscriptionStore) *Server {
	messageTemplateHandler := NewMessageTemplateHandler(db)
	return &Server{
		httpServer: &http.Server{
			Addr:    addr,
			Handler: createEchoServer(webhook, authHandler, messageTemplateHandler, groupHandler, contactHandler, inboxHandler, broadcastHandler, db, subscriptionStore),
		},
		webhookHandler:         webhook,
		authHandler:            authHandler,
		messageTemplateHandler: messageTemplateHandler,
		groupHandler:           groupHandler,
		contactHandler:         contactHandler,
		inboxHandler:           inboxHandler,
		broadcastHandler:       broadcastHandler,
		db:                     db,
		subscriptionStore:      subscriptionStore,
	}
}

// createEchoServer sets up the Echo server with middleware.
func createEchoServer(webhook *DeviceHandler, authHandler *AuthHandler, messageTemplateHandler *MessageTemplateHandler, groupHandler *GroupHandler, contactHandler *ContactHandler, inboxHandler *InboxHandler, broadcastHandler *BroadcastHandler, db db.Querier, subscriptionStore *wa.SubscriptionStore) *echo.Echo {
	e := echo.New()

	e.Validator = &CustomValidator{validator: validator.New()}

	// Middleware configuration
	e.Use(middleware.Logger())
	e.Use(middleware.CORS())
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Recover())
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(
		rate.Limit(20),
	)))

	e.Static("/api/media", "uploads")

	// Separate function for routes configuration
	registerRoutes(e, webhook, authHandler, messageTemplateHandler, groupHandler, contactHandler, inboxHandler, broadcastHandler, db, subscriptionStore)

	return e
}

// registerRoutes sets up the routes for the Echo server.
// It configures the following endpoints:
// - GET /client/qr: Handles requests to retrieve a QR code using the SendQrHandler method of the ConnectionHandler.
// - GET /: Handles requests to the root path using the Index method of the ConnectionHandler.
// - POST /http: Handles http events using the SendMessage method of the DeviceHandler.
func registerRoutes(e *echo.Echo, webhook *DeviceHandler, authHandler *AuthHandler, messageTemplateHandler *MessageTemplateHandler, groupHandler *GroupHandler, contactHandler *ContactHandler, inboxHandler *InboxHandler, broadcastHandler *BroadcastHandler, db db.Querier, subscriptionStore *wa.SubscriptionStore) {

	e.POST("/login", authHandler.Login)

	admin := e.Group("/admin", Jwt())

	//v1.GET("/users", authHandler.GetUsers)
	admin.POST("/users", authHandler.Register)

	// API Keys (new multi-key system)
	admin.GET("/users/api-keys", authHandler.ListAPIKeys, JwtUserIDMiddleware())
	admin.POST("/users/api-keys", authHandler.CreateAPIKey, JwtUserIDMiddleware())
	admin.DELETE("/users/api-keys/:id", authHandler.DeleteAPIKey, JwtUserIDMiddleware())

	// Legacy single key (keep for backwards compatibility)
	admin.POST("/users/api-key", authHandler.GenerateAPIKey, JwtUserIDMiddleware())
	admin.POST("/clients", webhook.RegisterDevice, JwtUserIDMiddleware())
	admin.GET("/clients", webhook.GetDevices, JwtUserIDMiddleware())
	admin.POST("/clients/:client_id/connect", webhook.ConnectDevice, JwtUserIDMiddleware())
	admin.DELETE("/clients/:client_id/disconnect", webhook.DisconnectDevice, JwtUserIDMiddleware())
	admin.GET("/clients/:client_id/qr", webhook.GetDeviceQR, JwtUserIDMiddleware())
	admin.GET("/clients/:client_id/status", webhook.ConnectionStatus, JwtUserIDMiddleware())

	// Admin Device Subscriptions (JWT-protected)
	admin.GET("/clients/:client_id/subscriptions", webhook.GetDeviceSubscriptions, JwtUserIDMiddleware())
	admin.PUT("/clients/:client_id/subscriptions", webhook.UpdateDeviceSubscriptions, JwtUserIDMiddleware())

	// Admin Message Templates (JWT-protected)
	admin.GET("/templates", messageTemplateHandler.GetUserTemplates, JwtUserIDMiddleware())
	admin.POST("/templates", messageTemplateHandler.CreateTemplate, JwtUserIDMiddleware())
	admin.PUT("/templates/:id", messageTemplateHandler.UpdateTemplate, JwtUserIDMiddleware())
	admin.DELETE("/templates/:id", messageTemplateHandler.DeleteTemplate, JwtUserIDMiddleware())

	// Admin Contacts (JWT-protected)
	admin.GET("/contacts/:client_id", contactHandler.GetContacts, JwtUserIDMiddleware())
	admin.PUT("/contacts/:client_id/sync", contactHandler.SyncContacts, JwtUserIDMiddleware())

	// Admin Groups (JWT-protected)
	admin.GET("/groups/:client_id", groupHandler.GetJoinedGroups, JwtUserIDMiddleware())
	admin.PUT("/groups/:client_id/sync", groupHandler.SyncJoinedGroup, JwtUserIDMiddleware())

	// Admin Inbox (JWT-protected)
	admin.GET("/inbox/:client_id/threads", inboxHandler.GetThreads, JwtUserIDMiddleware())
	admin.GET("/inbox/:client_id/threads/:chat_jid/messages", inboxHandler.GetThreadMessages, JwtUserIDMiddleware())
	admin.POST("/inbox/:client_id/threads/:chat_jid/send", inboxHandler.SendMessage, JwtUserIDMiddleware())
	admin.POST("/inbox/:client_id/threads/:chat_jid/send-media", inboxHandler.SendMediaMessage, JwtUserIDMiddleware())
	admin.POST("/inbox/:client_id/threads/send", inboxHandler.SendNewMessage, JwtUserIDMiddleware())
	admin.POST("/inbox/:client_id/threads/schedule", inboxHandler.ScheduleMessage, JwtUserIDMiddleware())
	admin.POST("/inbox/:client_id/threads/:chat_jid/read", inboxHandler.MarkRead, JwtUserIDMiddleware())

	// Admin Broadcasts (JWT-protected)
	admin.GET("/broadcasts", broadcastHandler.GetBroadcastJobs, JwtUserIDMiddleware())
	admin.POST("/broadcasts", broadcastHandler.CreateBroadcast, JwtUserIDMiddleware())
	admin.GET("/broadcasts/:id", broadcastHandler.GetBroadcastJob, JwtUserIDMiddleware())

	// API Key
	v1 := e.Group("/v1", AppKeyAuthMiddleware(db))
	v1.POST("/chats", webhook.SendMessage)
	v1.POST("/chats/template", webhook.SendTemplateMessage)
	v1.POST("/chats/media", webhook.SendMediaMessage)

	// Message Templates
	v1.POST("/templates", messageTemplateHandler.CreateTemplate)
	v1.PUT("/templates/:id", messageTemplateHandler.UpdateTemplate)
	v1.DELETE("/templates/:id", messageTemplateHandler.DeleteTemplate)
	v1.GET("/templates", messageTemplateHandler.GetUserTemplates)

	// Groups
	v1.PUT("/groups/:client_id/sync", groupHandler.SyncJoinedGroup)
	v1.GET("/groups/:client_id", groupHandler.GetJoinedGroups)

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
