-- name: CreateBroadcastJob :one
INSERT INTO broadcast_jobs (
        user_id,
        device_id,
        name,
        message_type,
        content,
        media_url,
        media_filename,
        cooldown,
        is_scheduled,
        scheduled_at
    )
VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        COALESCE($9::boolean, FALSE),
        $10::timestamptz
    )
RETURNING *;
-- name: GetBroadcastJobs :many
SELECT *
FROM broadcast_jobs
WHERE user_id = $1
ORDER BY created_at DESC;
-- name: GetBroadcastJob :one
SELECT *
FROM broadcast_jobs
WHERE id = $1
    AND user_id = $2;
-- name: UpdateBroadcastJobStatus :exec
UPDATE broadcast_jobs
SET status = $2,
    updated_at = NOW()
WHERE id = $1;
-- name: CreateBroadcastRecipient :exec
INSERT INTO broadcast_recipients (job_id, recipient_jid)
VALUES ($1, $2) ON CONFLICT (job_id, recipient_jid) DO NOTHING;
-- name: GetBroadcastRecipients :many
SELECT *
FROM broadcast_recipients
WHERE job_id = $1;
-- name: UpdateBroadcastRecipientStatus :exec
UPDATE broadcast_recipients
SET status = $3,
    error_message = $4,
    sent_at = NOW()
WHERE job_id = $1
    AND recipient_jid = $2;
-- name: GetPendingBroadcastJobs :many
SELECT *
FROM broadcast_jobs
WHERE status = 'pending'
    AND (
        is_scheduled = FALSE
        OR (
            is_scheduled = TRUE
            AND scheduled_at <= NOW()
        )
    )
ORDER BY created_at ASC;
-- name: GetPendingRecipients :many
SELECT *
FROM broadcast_recipients
WHERE job_id = $1
    AND status = 'pending'
ORDER BY id ASC;