package http

import "mime/multipart"

type MessageType string

const (
	MessageTypeText       MessageType = "text"
	MessageTypeMediaImage MessageType = "image"
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

type SendMessageResponse struct {
	MessageID string `json:"message_id"`
}

type SendMediaMessageRequest struct {
	ClientID     string                `json:"client_id" form:"client_id" validate:"required"`
	MobileNumber string                `json:"mobile_number" form:"mobile_number" validate:"required"`
	MediaURL     *multipart.FileHeader `json:"media_url" form:"media_url" validate:"required"`
	Caption      string                `json:"caption,omitempty" form:"caption"`
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

// MessageTemplateRequest represents a request to create or update a message template
type MessageTemplateRequest struct {
	Name      string        `json:"name" validate:"required"`
	Content   string        `json:"content" validate:"required"`
	Variables []interface{} `json:"variables"`
}
