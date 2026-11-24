CREATE TABLE own_computers (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  added_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  added_at INTEGER NOT NULL,
  code_digest TEXT,
  code_ciphertext TEXT,
  code_expires_at INTEGER,
  token_digest TEXT,
  connected_at INTEGER,
  last_seen_at INTEGER,
  cpus INTEGER,
  memory_bytes INTEGER,
  system TEXT,
  program_version TEXT,
  computer_protocol_version INTEGER,
  workspace_limit INTEGER,
  build_requested_at INTEGER,
  build_requested_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  removed_at INTEGER,
  removed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (org_id, id)
);

CREATE UNIQUE INDEX own_computers_code_digest
  ON own_computers(code_digest) WHERE code_digest IS NOT NULL;
CREATE UNIQUE INDEX own_computers_token_digest
  ON own_computers(token_digest) WHERE token_digest IS NOT NULL;
CREATE INDEX own_computers_org_list
  ON own_computers(org_id, added_at, id) WHERE removed_at IS NULL;

ALTER TABLE workspaces ADD COLUMN computer_id TEXT REFERENCES own_computers(id);
ALTER TABLE org_images ADD COLUMN computer_id TEXT REFERENCES own_computers(id);
ALTER TABLE automations ADD COLUMN computer_id TEXT REFERENCES own_computers(id);

CREATE INDEX workspaces_own_computer
  ON workspaces(computer_id, org_id) WHERE computer_id IS NOT NULL;
