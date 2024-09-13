package main

import "github.com/fransfilastap/kontak/pkg"

func main() {
	cfg := pkg.LoadConfig()
	app := pkg.NewApp(cfg)
	app.Run()
}
