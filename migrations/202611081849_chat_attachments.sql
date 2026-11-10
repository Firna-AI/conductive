CREATE TABLE chat_attachments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  uploader_user_id TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  multipart_id TEXT,
  state TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_workspace_id TEXT,
  claimed_message_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX chat_attachments_expiry ON chat_attachments(state, expires_at);
CREATE INDEX chat_attachments_org ON chat_attachments(org_id);
CREATE INDEX chat_attachments_workspace ON chat_attachments(claimed_workspace_id);
