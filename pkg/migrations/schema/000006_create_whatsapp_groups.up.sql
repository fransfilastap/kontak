-- Create WhatsApp groups table
CREATE TABLE whatsapp_groups
(
    id                UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id         varchar(255) REFERENCES clients (id) ON DELETE CASCADE,
    group_id          VARCHAR(255) NOT NULL,
    group_name        VARCHAR(255) NOT NULL,
    group_description TEXT,
    participant_count INTEGER                  DEFAULT 0,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (device_id, group_id)
);