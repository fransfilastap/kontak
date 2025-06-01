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
	Email    string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
}

// SendTemplateMessageRequest represents a request to send a message using a template
type SendTemplateMessageRequest struct {
	DeviceID   string                 `json:"deviceId" validate:"required"`
	To         string                 `json:"to" validate:"required"`
	TemplateID string                 `json:"templateId" validate:"required"`
	Variables  map[string]interface{} `json:"variables"`
}
