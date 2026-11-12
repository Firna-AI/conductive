CREATE TABLE agent_logins_with_endpoints (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL CHECK (agent IN ('claude', 'codex')),
  kind TEXT NOT NULL CHECK (kind IN ('token', 'api-key', 'endpoint')),
  ciphertext TEXT NOT NULL,
  endpoint_origin TEXT,
  refresh_claim TEXT,
  refresh_claim_until INTEGER,
  failure_cause TEXT,
  no_reuse INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, agent),
  CHECK (
    (kind = 'endpoint' AND endpoint_origin IS NOT NULL AND endpoint_origin != '') OR
    (kind != 'endpoint' AND endpoint_origin IS NULL)
  )
);

INSERT INTO agent_logins_with_endpoints
  (user_id, agent, kind, ciphertext, endpoint_origin, no_reuse, created_at, updated_at,
   refresh_claim, refresh_claim_until, failure_cause)
SELECT user_id, agent, kind, ciphertext, NULL, no_reuse, created_at, updated_at,
  refresh_claim, refresh_claim_until, failure_cause
FROM agent_logins;

DROP TABLE agent_logins;
ALTER TABLE agent_logins_with_endpoints RENAME TO agent_logins;
