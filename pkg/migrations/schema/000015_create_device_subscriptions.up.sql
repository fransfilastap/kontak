-- Create device_subscriptions table
CREATE TABLE IF NOT EXISTS device_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_device_subscriptions_device_id ON device_subscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_subscriptions_event_type ON device_subscriptions(event_type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_device_subscriptions_updated_at
    BEFORE UPDATE ON device_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();