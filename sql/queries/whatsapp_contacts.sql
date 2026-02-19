-- name: UpsertWhatsAppContact :exec
INSERT INTO whatsapp_contacts (device_id,
                               jid,
                               full_name,
                               push_name,
                               business_name,
                               phone_number,
                               updated_at)
VALUES ($1, $2, $3, $4, $5, $6, NOW())
ON CONFLICT (device_id, jid)
    DO UPDATE SET full_name     = EXCLUDED.full_name,
                  push_name     = EXCLUDED.push_name,
                  business_name = EXCLUDED.business_name,
                  phone_number  = EXCLUDED.phone_number,
                  updated_at    = EXCLUDED.updated_at;


-- name: GetDeviceContacts :many
SELECT *
FROM whatsapp_contacts
WHERE device_id = $1
ORDER BY COALESCE(full_name, push_name, jid) ASC;
