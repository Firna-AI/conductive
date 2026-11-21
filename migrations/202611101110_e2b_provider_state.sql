CREATE TABLE e2b_create_operations (
  provider_account TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  sandbox_id TEXT,
  rejection_status INTEGER,
  rejection_code TEXT,
  rejection_retry_seconds INTEGER,
  PRIMARY KEY (provider_account, idempotency_key)
);

CREATE INDEX e2b_create_sandbox ON e2b_create_operations (provider_account, sandbox_id);

CREATE TABLE e2b_traffic_tokens (
  provider_account TEXT NOT NULL,
  sandbox_id TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  PRIMARY KEY (provider_account, sandbox_id)
);

CREATE TABLE e2b_snapshot_mappings (
  provider_account TEXT NOT NULL,
  name TEXT NOT NULL,
  source_sandbox_id TEXT NOT NULL,
  snapshot_id TEXT,
  state TEXT NOT NULL DEFAULT 'pending',
  rejection_status INTEGER,
  rejection_code TEXT,
  rejection_retry_seconds INTEGER,
  PRIMARY KEY (provider_account, name)
);
