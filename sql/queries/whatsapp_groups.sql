-- name: UpsertWhatsAppGroup :exec
INSERT INTO whatsapp_groups (device_id,
                             group_id,
                             group_name,
                             group_description,
                             participant_count,
                             updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (device_id, group_id)
    DO UPDATE SET group_name        = EXCLUDED.group_name,
                  group_description = EXCLUDED.group_description,
                  participant_count = EXCLUDED.participant_count,
                  updated_at        = EXCLUDED.updated_at;


-- name: GetDeviceGroups :many
SELECT *
FROM whatsapp_groups
WHERE device_id = $1
ORDER BY group_name ASC;
