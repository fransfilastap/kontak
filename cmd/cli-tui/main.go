package main

import (
	"context"
	"fmt"
	"os"

	"github.com/AlecAivazis/survey/v2"
	"github.com/fransfilastap/kontak/pkg/config"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

func main() {
	email := os.Getenv("CLI_USER_EMAIL")
	password := os.Getenv("CLI_USER_PASSWORD")

	if email != "" && password != "" {
		createUserNonInteractive(email, password)
		return
	}

	if len(os.Args) > 1 && os.Args[1] == "list" {
		listUsers()
		return
	}

	runInteractive()
}

func runInteractive() {
	cfg := config.LoadConfig()

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DB)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping database")
	}

	queries := db.New(pool)

	qs := []*survey.Question{
		{
			Name: "email",
			Prompt: &survey.Input{
				Message: "Email:",
				Help:    "Enter user email address",
			},
			Validate: survey.Required,
		},
		{
			Name: "password",
			Prompt: &survey.Password{
				Message: "Password:",
				Help:    "Enter user password",
			},
			Validate: survey.Required,
		},
	}

	answers := struct {
		Email    string
		Password string
	}{}

	err = survey.Ask(qs, &answers)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to read input")
	}

	hash, err := security.GenerateHash(answers.Password)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to hash password")
	}

	user, err := queries.CreateUser(ctx, db.CreateUserParams{
		Email:    answers.Email,
		Password: hash,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create user")
	}

	fmt.Printf("\n✓ User created successfully!\n")
	fmt.Printf("  ID:    %d\n", user.ID)
	fmt.Printf("  Email: %s\n", user.Email)
}

func createUserNonInteractive(email, password string) {
	cfg := config.LoadConfig()

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DB)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer pool.Close()

	queries := db.New(pool)

	hash, err := security.GenerateHash(password)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to hash password")
	}

	user, err := queries.CreateUser(ctx, db.CreateUserParams{
		Email:    email,
		Password: hash,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create user")
	}

	fmt.Printf("\n✓ User created successfully!\n")
	fmt.Printf("  ID:    %d\n", user.ID)
	fmt.Printf("  Email: %s\n", user.Email)
}

func listUsers() {
	cfg := config.LoadConfig()

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DB)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer pool.Close()

	queries := db.New(pool)

	users, err := queries.GetUsers(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get users")
	}

	fmt.Println("")
	fmt.Println("┌─────────────────────────────────────────┐")
	fmt.Println("│             Users List                  │")
	fmt.Println("├─────────────────────────────────────────┤")
	for _, user := range users {
		fmt.Printf("│ ID: %-2d │ Email: %-25s │\n", user.ID, user.Email)
	}
	fmt.Println("├─────────────────────────────────────────┤")
	fmt.Printf("│ Total: %d users                          │\n", len(users))
	fmt.Println("└─────────────────────────────────────────┘")
	fmt.Println("")
}
