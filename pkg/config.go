package pkg

const (
	DefaultPort = 8080
	DefaultHost = "0.0.0.0"
)

type Config struct {
	Port int
	Host string
	DB   string
}

func LoadConfig() *Config {
	return &Config{
		Port: DefaultPort,
		Host: DefaultHost,
		DB:   "postgres://ffilasta:12345678@localhost:5432/kontak_db?sslmode=disable",
	}
}
