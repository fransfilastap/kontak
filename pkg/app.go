package pkg

import (
	"context"
	"fmt"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"golang.org/x/time/rate"
	"html/template"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

type App struct {
	HttpServer     *Server
	WhatsappClient *WhatsappClient
	Config         *Config
	qrChan         chan WaConnectEvent
}

type WaConnectEvent struct {
	Event string
	Data  string
}

func NewApp(config *Config) *App {

	addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
	qrChan := make(chan WaConnectEvent)
	waClient := NewWhatsappClient(config.DB, qrChan)

	server := createEchoServer()
	waConnectionHandler := NewConnectionHandler(qrChan, waClient)
	webhookHandler := NewWebhook(waClient)

	server.GET("/wa-connect", waConnectionHandler.SendQrHandler)
	server.GET("/", waConnectionHandler.Index)
	server.POST("/webhook", webhookHandler.Handle)

	httpServer := NewServer(addr, server)

	return &App{
		HttpServer:     httpServer,
		WhatsappClient: waClient,
		Config:         config,
		qrChan:         qrChan,
	}
}

func (app *App) Run() {
	var wg sync.WaitGroup
	go app.HttpServer.Start()
	app.WhatsappClient.Listen()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	log.Printf("Server is shutting down due to signal: %v\n", sig)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := app.HttpServer.httpServer.Shutdown(ctx); err != nil {
			log.Fatalf("Could not gracefully shutdown the server: %v\n", err)
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		app.WhatsappClient.waClient.Disconnect()
	}()

	wg.Wait()
	log.Println("Server gracefully stopped")
	cancel() // Call cancel to ensure context is released
}

func createEchoServer() *echo.Echo {
	e := echo.New()
	t := &Template{
		Templates: template.Must(template.ParseGlob("public/views/*.html")),
	}
	e.Renderer = t
	e.Use(middleware.Logger())
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Recover())
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(
		rate.Limit(20),
	)))

	return e
}
