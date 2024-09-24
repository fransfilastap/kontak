package main

import (
	"github.com/fransfilastap/kontak/pkg/app"
	"github.com/fransfilastap/kontak/pkg/config"
)

func main() {
	cfg := config.LoadConfig()
	app := app.NewKontak(cfg)
	app.Run()
}
