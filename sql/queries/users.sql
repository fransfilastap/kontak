-- name: CreateUser :one
INSERT INTO users (username, password)
VALUES ($1, $2)
RETURNING *;

-- name: GetUserByUsername :one
SELECT *
FROM users
WHERE username = $1
LIMIT 1;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = $1
LIMIT 1;

-- name: UpdateUser :one
UPDATE users
SET username = $2, password = $3
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: GetUsers :many
SELECT *
FROM users;

-- name: GetUserByAPIKey :one
SELECT *
FROM users
WHERE api_key = $1
LIMIT 1;

-- name: SetUserAPIKey :one
UPDATE users
SET api_key = $1, api_key_prefix = $2
WHERE id = $3
RETURNING *;

-- name: SetUserAPIPrefix :exec
UPDATE users
SET api_key_prefix = $1
WHERE id = $2;

-- name: RevokeUserAPIKey :exec
UPDATE users
SET api_key = NULL, api_key_prefix = NULL
WHERE id = $1;
