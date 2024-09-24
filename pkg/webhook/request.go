package webhook

type MessageType string

const (
	MessageTypeText  MessageType = "text"
	MessageTypeMedia MessageType = "media"
)

// SendMessageRequest represents a WhatsApp message structure with fields for mobile number, text, and type.
// MobileNumber is the recipient's phone number.
// Text is the content of the message.
// Type signifies the message type (e.g., text, media).
type SendMessageRequest struct {
	ClientID     string      `json:"client_id" validate:"required"`
	MobileNumber string      `json:"mobile_number" validate:"required"`
	Text         string      `json:"text" validate:"required"`
	Type         MessageType `json:"type" validate:"required"`
}

type LoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type RegisterRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}
