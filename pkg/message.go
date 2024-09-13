package pkg

type Message struct {
	MobileNumber string `json:"mobile_number" validate:"required"`
	Text         string `json:"text" validate:"required"`
	Type         string `json:"type" validate:"required"`
}
