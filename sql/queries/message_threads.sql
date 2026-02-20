-- name: GetThreads :many
SELECT
    t.id,
    t.device_id,
    t.chat_jid,
    t.chat_type,
    t.last_message_at,
    t.last_message_content,
    t.last_message_type,
    t.last_message_direction,
    t.unread_count,
    COALESCE(wc.full_name, wc.push_name, wg.group_name, '') AS chat_name
FROM message_threads t
LEFT JOIN whatsapp_contacts wc ON wc.device_id = t.device_id AND wc.jid = t.chat_jid
LEFT JOIN whatsapp_groups wg ON wg.device_id = t.device_id AND wg.group_id = t.chat_jid
WHERE t.device_id = @device_id
ORDER BY t.last_message_at DESC
LIMIT @query_limit OFFSET @query_offset;

-- name: GetThreadMessages :many
SELECT
    m.id, m.device_id, m.user_id, m.recipient, m.recipient_type,
    m.message_type, m.content, m.media_url, m.media_filename,
    m.buttons, m.template_id, m.status, m.sent_at, m.delivered_at,
    m.read_at, m.direction, m.wa_message_id, m.sender_jid,
    COALESCE(wc.full_name, wc.push_name, '') AS sender_name
FROM message_logs m
LEFT JOIN whatsapp_contacts wc ON wc.device_id = m.device_id AND wc.jid = m.sender_jid
WHERE m.device_id = $1 AND m.recipient = $2
ORDER BY m.sent_at ASC
LIMIT $3 OFFSET $4;

-- name: UpsertThread :exec
INSERT INTO message_threads (device_id, chat_jid, chat_type, last_message_at, last_message_content, last_message_type, last_message_direction, unread_count)
VALUES (@device_id, @chat_jid, @chat_type, NOW(), @content, @message_type, @direction,
    CASE WHEN @is_incoming::bool THEN 1 ELSE 0 END
)
ON CONFLICT (device_id, chat_jid) DO UPDATE SET
    last_message_at = NOW(),
    last_message_content = EXCLUDED.last_message_content,
    last_message_type = EXCLUDED.last_message_type,
    last_message_direction = EXCLUDED.last_message_direction,
    unread_count = CASE
        WHEN EXCLUDED.last_message_direction = 'incoming'
        THEN message_threads.unread_count + 1
        ELSE message_threads.unread_count
    END,
    updated_at = NOW();

-- name: ResetThreadUnread :exec
UPDATE message_threads
SET unread_count = 0, updated_at = NOW()
WHERE device_id = $1 AND chat_jid = $2;
