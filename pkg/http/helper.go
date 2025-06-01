package http

import "github.com/labstack/echo/v4"

// Helper function to get user ID from context
func getUserIDFromContext(c echo.Context) int32 {
	return c.Get("userID").(int32)
}
