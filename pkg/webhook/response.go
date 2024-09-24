package webhook

type QRCodeResponse struct {
	IsConnected bool   `json:"is_connected"`
	Code        string `json:"code"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Context string `json:"context,omitempty"`
}

type GenericResponse struct {
	Message string `json:"message"`
}

type DeviceConnectionResponse struct {
	ServerError bool   `json:"server_error"`
	Message     string `json:"message"`
}

type DeviceDisconnectionResponse struct {
	ServerError bool   `json:"server_error"`
	Message     string `json:"message"`
}

type ConnectionStatusResponse struct {
	IsConnected bool `json:"is_connected"`
}

type RegisterResponse struct {
	Message string `json:"message"`
}

type GenerateAPIKeyResponse struct {
	APIKey string `json:"api_key"`
}
