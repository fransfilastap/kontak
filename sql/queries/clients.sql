-- filename: queries/clients/create_new_client.sql

-- name: CreateNewClient :one
INSERT INTO clients (id,
                     name,
                     whatsapp_number,
                     jid,
                     user_id,
                     is_connected)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: UpdateQRCode :one
UPDATE clients
SET qr_code = $1
WHERE ID = $2
RETURNING *;

-- name: SetClientJID :one
UPDATE clients
SET jid = $1
WHERE ID = $2
RETURNING *;

-- name: SetConnectionStatus :one
UPDATE clients
SET is_connected = $1
WHERE ID = $2
RETURNING *;


-- name: GetClientByJID :one
SELECT *
FROM clients
WHERE jid = $1
LIMIT 1;


-- name: GetClients :many
SELECT *
FROM clients;

-- name: GetClient :one
SELECT *
FROM clients WHERE id = $1 LIMIT 1;

-- name: DeleteClient :exec
DELETE
FROM clients
WHERE ID = $1;