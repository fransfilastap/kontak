-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Create api_key_logs table
CREATE TABLE IF NOT EXISTS api_key_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id),
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_logs_key_id ON api_key_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_created_at ON api_key_logs(created_at);

-- Migrate existing API keys from users table
INSERT INTO api_keys (user_id, name, key_hash, key_prefix, created_at, is_active)
SELECT 
    id,
    'Default Key',
    COALESCE(api_key, ''),
    COALESCE(api_key_prefix, ''),
    COALESCE(created_at, NOW()),
    CASE WHEN api_key IS NOT NULL AND api_key != '' THEN TRUE ELSE FALSE END
FROM users 
WHERE api_key IS NOT NULL AND api_key != '';