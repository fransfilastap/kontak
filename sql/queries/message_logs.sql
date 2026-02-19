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

-- name: LogIncomingMessage :one
INSERT INTO message_logs (device_id, recipient, recipient_type, message_type, content, status, direction, sender_jid, wa_message_id)
VALUES ($1, $2, $3, 'text', $4, 'delivered', 'incoming', $5, $6)
RETURNING *;

-- name: LogOutgoingMessage :one
INSERT INTO message_logs (device_id, recipient, recipient_type, message_type, content, status, direction, wa_message_id)
VALUES ($1, $2, $3, $4, $5, 'sent', 'outgoing', $6)
RETURNING *;

-- name: GetConversations :many
SELECT
  m.recipient,
  m.recipient_type,
  m.sent_at AS last_message_at,
  m.content AS last_message_content,
  m.direction AS last_message_direction,
  COALESCE(
    (SELECT COUNT(*) FROM message_logs u
     WHERE u.device_id = m.device_id AND u.recipient = m.recipient
       AND u.direction = 'incoming' AND u.status != 'read'), 0
  )::int AS unread_count,
  COALESCE(wc.full_name, wc.push_name, wg.group_name) AS recipient_name
FROM message_logs m
INNER JOIN (
  SELECT recipient, MAX(sent_at) AS max_sent_at
  FROM message_logs
  WHERE device_id = @device_id
  GROUP BY recipient
) latest ON m.recipient = latest.recipient AND m.sent_at = latest.max_sent_at
LEFT JOIN whatsapp_contacts wc ON wc.device_id = m.device_id AND wc.jid = m.recipient
LEFT JOIN whatsapp_groups wg ON wg.device_id = m.device_id AND wg.group_id = m.recipient
WHERE m.device_id = @device_id
ORDER BY m.sent_at DESC
LIMIT @query_limit OFFSET @query_offset;

-- name: GetConversationMessages :many
SELECT 
    m.*,
    COALESCE(wc.full_name, wc.push_name) AS sender_name
FROM message_logs m
LEFT JOIN whatsapp_contacts wc ON wc.device_id = m.device_id AND wc.jid = m.sender_jid
WHERE m.device_id = $1 AND m.recipient = $2
ORDER BY m.sent_at ASC
LIMIT $3 OFFSET $4;

-- name: UpdateMessageStatus :exec
UPDATE message_logs SET status = $2 WHERE wa_message_id = $1;

-- name: MarkConversationRead :exec
UPDATE message_logs
SET status = 'read'
WHERE device_id = $1 AND recipient = $2 AND direction = 'incoming' AND status != 'read';
