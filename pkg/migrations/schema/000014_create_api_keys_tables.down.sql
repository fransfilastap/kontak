-- Drop indexes first
DROP INDEX IF EXISTS idx_api_key_logs_key_id;
DROP INDEX IF EXISTS idx_api_key_logs_created_at;
DROP INDEX IF EXISTS idx_api_keys_user_id;
DROP INDEX IF EXISTS idx_api_keys_prefix;

-- Drop tables
DROP TABLE IF EXISTS api_key_logs;
DROP TABLE IF EXISTS api_keys;