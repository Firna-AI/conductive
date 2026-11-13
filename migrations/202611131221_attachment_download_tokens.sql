CREATE TABLE attachment_download_tokens (
  digest TEXT PRIMARY KEY,
  attachment_id TEXT NOT NULL REFERENCES chat_attachments(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  sandbox_id TEXT NOT NULL,
  provider_account TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER
);

CREATE INDEX attachment_download_tokens_expiry ON attachment_download_tokens(expires_at);
