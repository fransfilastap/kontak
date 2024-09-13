package pkg

import (
	"github.com/labstack/echo/v4"
	"log"
	"net/http"
)

type Server struct {
	httpServer *http.Server
}

// NewServer creates a new Server using Echo as the handler
func NewServer(addr string, e *echo.Echo) *Server {
	return &Server{
		httpServer: &http.Server{
			Addr:    addr,
			Handler: e,
		},
	}
}

// Start starts the server and listens for incoming requests
func (s *Server) Start() {
	if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Could not listen on %s: %v\n", s.httpServer.Addr, err)
	}
	log.Printf("Server is ready to handle requests at %s", s.httpServer.Addr)
}
