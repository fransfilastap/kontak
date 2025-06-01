-- name: SendMessageData :one
INSERT INTO message_logs (device_id,
                          user_id,
                          recipient,
                          recipient_type,
                          message_type,
                          content,
                          media_url,
                          media_filename,
                          buttons,
                          status)
VALUES ($1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::text, -- or NULL
        $8::varchar(255), -- or NULL
        $9::jsonb, -- or NULL
        'sent')
RETURNING *;


-- name: GetMessageHistory :many
SELECT *
FROM message_logs
WHERE user_id = $1
ORDER BY sent_at DESC
LIMIT $2;
