ALTER TABLE agent_logins ADD COLUMN refresh_claim TEXT;
ALTER TABLE agent_logins ADD COLUMN refresh_claim_until INTEGER;
ALTER TABLE agent_logins ADD COLUMN failure_cause TEXT;

CREATE TABLE codex_devices (
  handle_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ciphertext TEXT,
  state TEXT NOT NULL CHECK (state IN ('pending', 'polling', 'connected', 'expired', 'failed')),
  poll_interval_ms INTEGER NOT NULL,
  next_poll_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  poll_claim TEXT,
  poll_claim_until INTEGER,
  failure_cause TEXT
);

CREATE INDEX codex_devices_expiry ON codex_devices(expires_at);
