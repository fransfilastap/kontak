package main

import (
	"context"
	"fmt"
	"github.com/fransfilastap/kontak/pkg"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
	"golang.org/x/time/rate"
	"html/template"
	"net/http"
	"os"
	"os/signal"
	"syscall"
)

func main() {

	// setup echo
	e := echo.New()
	t := &pkg.Template{
		Templates: template.Must(template.ParseGlob("public/views/*.html")),
	}
	e.Renderer = t
	e.Use(middleware.Logger())
	e.Pre(middleware.RemoveTrailingSlash())
	e.Use(middleware.Recover())
	e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(
		rate.Limit(20),
	)))

	e.GET("/", func(c echo.Context) error {
		return c.Render(http.StatusOK, "index", nil) // Use "index.html" instead of "index"
	})

	// Create new server instance
	server := pkg.NewServer(":8080", e) // Port 8080 is used in this example

	// Start the server
	server.Start() // Run it in a separate goroutine

	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New("pgx", "postgres://ffilasta:12345678@localhost:5432/kontak_db?sslmode=disable", dbLog)
	if err != nil {
		panic(err)
	}

	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		panic(err)
	}

	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

	if client.Store.ID == nil {
		qrChan, err := client.GetQRChannel(context.Background())
		if err != nil {
			panic(err)
		}

		for evt := range qrChan {
			if evt.Event == "code" {
				fmt.Println(evt.Code)
			}
		}

	} else {
		fmt.Println("Already logged in")
		err = client.Connect()
		if err != nil {
			panic(err)
		}
	}

	// Listen to CTRL+C
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	client.Disconnect()

}
