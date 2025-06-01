-- Create message logs table
CREATE TABLE message_logs
(
    id             UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id      varchar(255) REFERENCES clients (id) ON DELETE CASCADE,
    user_id        integer REFERENCES users (id) ON DELETE CASCADE,
    recipient      VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(20)              DEFAULT 'individual' CHECK (recipient_type IN ('individual', 'group')),
    message_type   VARCHAR(20)              DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document', 'button')),
    content        TEXT         NOT NULL,
    media_url      TEXT,
    media_filename VARCHAR(255),
    buttons        JSONB,
    template_id    UUID         REFERENCES message_templates (id) ON DELETE SET NULL,
    status         VARCHAR(20)              DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    sent_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at   TIMESTAMP WITH TIME ZONE,
    read_at        TIMESTAMP WITH TIME ZONE
);