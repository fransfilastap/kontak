package wa

import "errors"

var (
	ErrClientNotFound     = errors.New("client not found")
	ErrClientNotConnected = errors.New("client not connected")
	ErrClientNotReady     = errors.New("client not ready")
	ErrMessageSendFailed  = errors.New("message send failed")
)
