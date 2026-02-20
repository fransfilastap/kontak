CREATE TABLE message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    chat_jid VARCHAR(255) NOT NULL,
    chat_type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (chat_type IN ('individual', 'group')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_content TEXT NOT NULL DEFAULT '',
    last_message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    last_message_direction VARCHAR(10) NOT NULL DEFAULT 'incoming',
    unread_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(device_id, chat_jid)
);

CREATE INDEX idx_message_threads_device_last ON message_threads (device_id, last_message_at DESC);
