CREATE TABLE
    clients (
        ID VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        whatsapp_number VARCHAR(20),
        jid VARCHAR(255),
        token TEXT,
        qr_code TEXT,
        is_connected BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP
        WITH
            TIME ZONE
    );