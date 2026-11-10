CREATE TABLE agent_logins_codex_token (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL CHECK (agent IN ('claude', 'codex')),
  kind TEXT NOT NULL CHECK (kind IN ('token', 'api-key')),
  ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  no_reuse INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, agent)
);

INSERT INTO agent_logins_codex_token
  (user_id, agent, kind, ciphertext, created_at, updated_at, no_reuse)
  SELECT user_id, agent, kind, ciphertext, created_at, updated_at, no_reuse
  FROM agent_logins;

DROP TABLE agent_logins;
ALTER TABLE agent_logins_codex_token RENAME TO agent_logins;
