-- filename: subscriptions.sql

-- name: CreateDeviceSubscription :one
INSERT INTO device_subscriptions (device_id, event_type, enabled)
VALUES ($1, $2, $3)
ON CONFLICT (device_id, event_type) 
DO UPDATE SET enabled = EXCLUDED.enabled
RETURNING *;

-- name: GetDeviceSubscription :one
SELECT *
FROM device_subscriptions
WHERE device_id = $1 AND event_type = $2
LIMIT 1;

-- name: GetDeviceSubscriptions :many
SELECT *
FROM device_subscriptions
WHERE device_id = $1;

-- name: GetAllDeviceSubscriptions :many
SELECT *
FROM device_subscriptions;

-- name: UpdateDeviceSubscription :one
UPDATE device_subscriptions
SET enabled = $1
WHERE device_id = $2 AND event_type = $3
RETURNING *;

-- name: DeleteDeviceSubscription :one
DELETE FROM device_subscriptions
WHERE device_id = $1 AND event_type = $2
RETURNING *;

-- name: DeleteAllDeviceSubscriptions :exec
DELETE FROM device_subscriptions
WHERE device_id = $1;

-- name: UpsertDeviceSubscriptions :exec
INSERT INTO device_subscriptions (device_id, event_type, enabled)
VALUES ($1, $2, $3)
ON CONFLICT (device_id, event_type) 
DO UPDATE SET enabled = EXCLUDED.enabled;