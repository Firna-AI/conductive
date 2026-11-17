CREATE TABLE org_agent_logins (
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  agent TEXT NOT NULL CHECK (agent IN ('claude', 'codex')),
  kind TEXT NOT NULL CHECK (kind IN ('api-key', 'endpoint')),
  ciphertext TEXT NOT NULL,
  endpoint_origin TEXT,
  use_for_every_member INTEGER NOT NULL DEFAULT 0 CHECK (use_for_every_member IN (0, 1)),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  endpoint_model_ids TEXT,
  endpoint_models_read_at INTEGER,
  endpoint_models_attempted_at INTEGER,
  endpoint_models_attempt_id TEXT,
  PRIMARY KEY (org_id, agent),
  CHECK (
    (kind = 'endpoint' AND endpoint_origin IS NOT NULL AND endpoint_origin != '') OR
    (kind = 'api-key' AND endpoint_origin IS NULL)
  )
);
