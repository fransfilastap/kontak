-- name: CreateAPIKey :one
INSERT INTO api_keys (user_id, name, key_hash, key_prefix)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetAPIKeysByUserID :many
SELECT * FROM api_keys 
WHERE user_id = $1 AND is_active = true 
ORDER BY created_at DESC LIMIT 5;

-- name: GetAPIKeyByPrefix :one
SELECT * FROM api_keys 
WHERE key_prefix = $1 AND is_active = true 
LIMIT 1;

-- name: GetAPIKeyByID :one
SELECT * FROM api_keys WHERE id = $1;

-- name: UpdateAPIKeyLastUsed :exec
UPDATE api_keys SET last_used_at = NOW() WHERE id = $1;

-- name: DeleteAPIKey :exec
UPDATE api_keys SET is_active = false WHERE id = $1;

-- name: LogAPIKeyUsage :exec
INSERT INTO api_key_logs (api_key_id, endpoint, method, ip_address)
VALUES ($1, $2, $3, $4);

-- name: GetAPIKeyUsageLogs :many
SELECT * FROM api_key_logs 
WHERE api_key_id = $1 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;