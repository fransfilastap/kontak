package http

import "github.com/labstack/echo/v4"

// Helper function to get user ID from context
func getUserIDFromContext(c echo.Context) int32 {
	if v := c.Get("userID"); v != nil {
		if id, ok := v.(int32); ok {
			return id
		}
	}
	return 0
}
