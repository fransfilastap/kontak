package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/fransfilastap/kontak/pkg/config"
	"github.com/fransfilastap/kontak/pkg/db"
	"github.com/fransfilastap/kontak/pkg/security"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

var (
	connection *pgxpool.Pool
	queries    db.Querier
	cfg        *config.Config
)

const (
	cyan   = "\033[36m"
	green  = "\033[32m"
	red    = "\033[31m"
	yellow = "\033[33m"
	gray   = "\033[90m"
	reset  = "\033[0m"
	bold   = "\033[1m"
)

type User struct {
	ID           int32
	Email        string
	Password     string
	ApiKeyPrefix string
	ApiKey       string
}

func initDB() {
	cfg = config.LoadConfig()

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DB)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	connection = pool

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping database")
	}

	queries = db.New(pool)
}

func getUsers() []User {
	ctx := context.Background()
	users, err := queries.GetUsers(ctx)
	if err != nil {
		fmt.Println(red + "Error: Failed to fetch users: " + err.Error() + reset)
		return nil
	}

	result := make([]User, len(users))
	for i, u := range users {
		result[i] = User{
			ID:           u.ID,
			Email:        u.Email,
			Password:     u.Password,
			ApiKeyPrefix: u.ApiKeyPrefix.String,
			ApiKey:       u.ApiKey.String,
		}
	}
	return result
}

func getUserByID(id int32) *User {
	ctx := context.Background()
	user, err := queries.GetUserByID(ctx, id)
	if err != nil {
		return nil
	}
	return &User{
		ID:           user.ID,
		Email:        user.Email,
		Password:     user.Password,
		ApiKeyPrefix: user.ApiKeyPrefix.String,
		ApiKey:       user.ApiKey.String,
	}
}

func createUser(email, password string) (*User, error) {
	ctx := context.Background()
	hash, err := security.GenerateHash(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user, err := queries.CreateUser(ctx, db.CreateUserParams{
		Email:    email,
		Password: hash,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &User{
		ID:    user.ID,
		Email: user.Email,
	}, nil
}

func updateUserPassword(id int32, newPassword string) error {
	ctx := context.Background()
	hash, err := security.GenerateHash(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	_, err = queries.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
		ID:       id,
		Password: hash,
	})
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

func deleteUser(id int32) error {
	ctx := context.Background()
	err := queries.DeleteUser(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

func main() {
	if len(os.Args) > 1 {
		handleCommand()
		return
	}
	initDB()
	runInteractive()
}

func handleCommand() {
	initDB()
	defer connection.Close()

	cmd := os.Args[1]

	switch cmd {
	case "list":
		listUsers()
	case "create":
		if len(os.Args) < 4 {
			fmt.Println("Usage: ./cli-tui create <email> <password>")
			os.Exit(1)
		}
		email := os.Args[2]
		password := os.Args[3]
		user, err := createUser(email, password)
		if err != nil {
			fmt.Println(red + "Error: " + err.Error() + reset)
			os.Exit(1)
		}
		fmt.Println(green + "✓ User created successfully!" + reset)
		fmt.Printf("  ID:    %d\n", user.ID)
		fmt.Printf("  Email: %s\n", user.Email)

	case "update":
		if len(os.Args) < 4 {
			fmt.Println("Usage: ./cli-tui update <id> <new_password>")
			os.Exit(1)
		}
		var id int32
		fmt.Sscanf(os.Args[2], "%d", &id)
		password := os.Args[3]
		err := updateUserPassword(id, password)
		if err != nil {
			fmt.Println(red + "Error: " + err.Error() + reset)
			os.Exit(1)
		}
		fmt.Println(green + "✓ Password updated successfully!" + reset)

	case "delete":
		if len(os.Args) < 3 {
			fmt.Println("Usage: ./cli-tui delete <id>")
			os.Exit(1)
		}
		var id int32
		fmt.Sscanf(os.Args[2], "%d", &id)
		err := deleteUser(id)
		if err != nil {
			fmt.Println(red + "Error: " + err.Error() + reset)
			os.Exit(1)
		}
		fmt.Println(green + "✓ User deleted successfully!" + reset)

	default:
		fmt.Println("Usage: ./cli-tui [command]")
		fmt.Println("")
		fmt.Println("Commands:")
		fmt.Println("  list                  List all users")
		fmt.Println("  create <email> <pw>   Create a new user")
		fmt.Println("  update <id> <pw>      Update user password")
		fmt.Println("  delete <id>           Delete a user")
		fmt.Println("")
		fmt.Println("Interactive mode: ./cli-tui")
	}
}

func listUsers() {
	users := getUsers()
	if users == nil {
		return
	}

	printBoxedTable(users)
}

func runInteractive() {
	defer connection.Close()

	users := getUsers()
	if users == nil {
		return
	}

	showUserList(&users)
}

func printBoxedTable(users []User) {
	border := "─────────────────────────────────────────────────────────────"

	fmt.Println("")
	fmt.Println(bold + cyan + "┌" + border + "┐" + reset)
	fmt.Println(bold + cyan + "│" + reset + bold + "                   Kontak Users                         " + bold + cyan + "│" + reset)
	fmt.Println(bold + cyan + "├" + border + "┤" + reset)
	fmt.Printf(bold+cyan+"│ %-4s │ %-30s │ %-15s │"+reset+"\n", "ID", "Email", "API Key Prefix")
	fmt.Println(bold + cyan + "├" + border + "┤" + reset)
	for _, u := range users {
		prefix := u.ApiKeyPrefix
		if prefix == "" {
			prefix = "-"
		} else if len(prefix) > 12 {
			prefix = prefix[:12] + "..."
		}
		fmt.Printf("│ %-4d │ %-30s │ %-15s │\n", u.ID, u.Email, prefix)
	}
	fmt.Println(bold + cyan + "├" + border + "┤" + reset)
	fmt.Printf("│ Total: %d users                                              │\n", len(users))
	fmt.Println(bold + cyan + "└" + border + "┘" + reset)
}

func showUserList(users *[]User) {
	for {
		printBoxedTable(*users)

		border := "─────────────────────────────────────────────────────────────"
		fmt.Println(bold + cyan + "┌" + border + "┐" + reset)
		fmt.Println(bold + cyan + "│ [C] Create  [U] Update Password  [D] Delete  [Q] Quit     │" + reset)
		fmt.Println(bold + cyan + "└" + border + "┘" + reset)
		fmt.Println("")
		fmt.Print(gray + "Enter user ID to manage (or command): " + reset)

		var input string
		fmt.Scanln(&input)

		switch strings.ToLower(input) {
		case "c":
			handleCreateUser(users)
		case "q":
			fmt.Println(green + "\nGoodbye!" + reset)
			return
		default:
			var id int32
			fmt.Sscanf(input, "%d", &id)
			if id > 0 {
				handleUserAction(id, users)
			}
		}
	}
}

func handleCreateUser(users *[]User) {
	border := "─────────────────────────────────────────────────────────────"

	fmt.Println("")
	fmt.Println(bold + cyan + "┌" + border + "┐" + reset)
	fmt.Println(bold + cyan + "│" + reset + bold + "                     Create New User                        " + bold + cyan + "│" + reset)
	fmt.Println(bold + cyan + "└" + border + "┘" + reset)
	fmt.Println("")

	email := promptInput("Email:    ")
	password := promptPassword("Password: ")

	user, err := createUser(email, password)
	if err != nil {
		fmt.Println(red + "\nError: " + err.Error() + reset)
		return
	}

	fmt.Println(green + "\n✓ User created successfully!" + reset)
	fmt.Printf("  ID:    %d\n", user.ID)
	fmt.Printf("  Email: %s\n", user.Email)

	*users = getUsers()
}

func handleUserAction(id int32, users *[]User) {
	user := getUserByID(id)
	if user == nil {
		fmt.Println(red + "\nError: User not found" + reset)
		return
	}

	for {
		border := "─────────────────────────────────────────────────────────────"
		fmt.Println("")
		fmt.Println(bold + cyan + "┌" + border + "┐" + reset)
		fmt.Printf(bold+cyan+"│"+reset+" User: %-50s "+bold+cyan+"│"+reset+"\n", user.Email)
		fmt.Printf(bold+cyan+"│"+reset+" ID:   %-50d "+bold+cyan+"│"+reset+"\n", user.ID)
		fmt.Println(bold + cyan + "├" + border + "┤" + reset)
		fmt.Println(bold + cyan + "│ [P] Change Password                                        │" + reset)
		fmt.Println(bold + cyan + "│ [D] Delete User                                            │" + reset)
		fmt.Println(bold + cyan + "│ [B] Back                                                    │" + reset)
		fmt.Println(bold + cyan + "└" + border + "┘" + reset)
		fmt.Println("")

		fmt.Print(gray + "Choose action: " + reset)

		var action string
		fmt.Scanln(&action)

		switch strings.ToLower(action) {
		case "p":
			handleUpdatePassword(user.ID)
			user = getUserByID(user.ID)
		case "d":
			if handleDeleteUser(user.ID, users) {
				return
			}
			user = getUserByID(user.ID)
			if user == nil {
				return
			}
		case "b":
			return
		}
	}
}

func handleUpdatePassword(userID int32) {
	border := "─────────────────────────────────────────────────────────────"

	fmt.Println("")
	fmt.Println(bold + cyan + "┌" + border + "┐" + reset)
	fmt.Println(bold + cyan + "│" + reset + bold + "                     Change Password                         " + bold + cyan + "│" + reset)
	fmt.Println(bold + cyan + "└" + border + "┘" + reset)
	fmt.Println("")

	password := promptPassword("New Password: ")
	confirm := promptPassword("Confirm Password: ")

	if password != confirm {
		fmt.Println(red + "\nError: Passwords do not match" + reset)
		return
	}

	if len(password) < 6 {
		fmt.Println(red + "\nError: Password must be at least 6 characters" + reset)
		return
	}

	err := updateUserPassword(userID, password)
	if err != nil {
		fmt.Println(red + "\nError: " + err.Error() + reset)
		return
	}

	fmt.Println(green + "\n✓ Password updated successfully!" + reset)
}

func handleDeleteUser(userID int32, users *[]User) bool {
	user := getUserByID(userID)
	if user == nil {
		fmt.Println(red + "\nError: User not found" + reset)
		return false
	}

	border := "─────────────────────────────────────────────────────────────"

	fmt.Println("")
	fmt.Println(bold + red + "┌" + border + "┐" + reset)
	fmt.Println(bold + red + "│" + reset + bold + "  ⚠ WARNING: This action cannot be undone!                " + bold + red + "│" + reset)
	fmt.Println(bold + red + "└" + border + "┘" + reset)
	fmt.Printf("\nTo confirm deletion, type '%s': ", user.Email)

	var confirm string
	fmt.Scanln(&confirm)

	if confirm != user.Email {
		fmt.Println(gray + "\nDeletion cancelled" + reset)
		return false
	}

	err := deleteUser(userID)
	if err != nil {
		fmt.Println(red + "\nError: " + err.Error() + reset)
		return false
	}

	fmt.Println(green + "\n✓ User deleted successfully!" + reset)
	*users = getUsers()
	return true
}

func promptInput(label string) string {
	fmt.Print(gray + label + reset)
	var value string
	fmt.Scanln(&value)
	return value
}

func promptPassword(label string) string {
	fmt.Print(gray + label + reset)
	var value string
	fmt.Scanln(&value)
	return value
}
