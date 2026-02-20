-- Create broadcast_jobs table
CREATE TABLE broadcast_jobs
(
    id             UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id        integer REFERENCES users (id) ON DELETE CASCADE,
    device_id      VARCHAR(255) REFERENCES clients (id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    message_type   VARCHAR(20)              DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'document')),
    content        TEXT         NOT NULL,
    media_url      TEXT,
    media_filename VARCHAR(255),
    cooldown       INTEGER                  DEFAULT 5, -- in seconds
    status         VARCHAR(20)              DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'paused')),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create broadcast_recipients table
CREATE TABLE broadcast_recipients
(
    id            UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id        UUID REFERENCES broadcast_jobs (id) ON DELETE CASCADE,
    recipient_jid VARCHAR(255) NOT NULL,
    status        VARCHAR(20)              DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at       TIMESTAMP WITH TIME ZONE,
    UNIQUE (job_id, recipient_jid)
);
