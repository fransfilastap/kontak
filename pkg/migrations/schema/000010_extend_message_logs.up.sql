ALTER TABLE message_logs
  ADD COLUMN direction     VARCHAR(10) NOT NULL DEFAULT 'outgoing'
      CHECK (direction IN ('outgoing', 'incoming')),
  ADD COLUMN wa_message_id VARCHAR(255),
  ADD COLUMN sender_jid    VARCHAR(255);

CREATE INDEX idx_message_logs_device_recipient ON message_logs (device_id, recipient, sent_at DESC);
CREATE UNIQUE INDEX idx_message_logs_wa_message_id ON message_logs (wa_message_id) WHERE wa_message_id IS NOT NULL;
