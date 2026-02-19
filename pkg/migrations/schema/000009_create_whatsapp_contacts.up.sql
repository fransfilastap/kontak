CREATE TABLE whatsapp_contacts (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id     VARCHAR(255) REFERENCES clients (id) ON DELETE CASCADE,
    jid           VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    push_name     VARCHAR(255),
    business_name VARCHAR(255),
    phone_number  VARCHAR(50),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (device_id, jid)
);
