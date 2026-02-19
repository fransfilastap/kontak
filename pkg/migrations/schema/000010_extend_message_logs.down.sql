DROP INDEX IF EXISTS idx_message_logs_wa_message_id;
DROP INDEX IF EXISTS idx_message_logs_device_recipient;

ALTER TABLE message_logs
  DROP COLUMN IF EXISTS sender_jid,
  DROP COLUMN IF EXISTS wa_message_id,
  DROP COLUMN IF EXISTS direction;
