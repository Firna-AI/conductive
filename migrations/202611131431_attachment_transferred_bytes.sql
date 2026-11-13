ALTER TABLE chat_attachments ADD COLUMN transferred_sandbox_id TEXT;
ALTER TABLE chat_attachments ADD COLUMN bytes_deleted_at INTEGER;

CREATE INDEX chat_attachments_transferred_bytes
  ON chat_attachments(id)
  WHERE state = 'claimed' AND transferred_sandbox_id IS NOT NULL AND bytes_deleted_at IS NULL;
