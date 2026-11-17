CREATE TABLE org_secrets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value_ciphertext TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  all_agents INTEGER NOT NULL DEFAULT 0 CHECK (all_agents IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (org_id, name),
  UNIQUE (org_id, id)
);

CREATE UNIQUE INDEX workspaces_org_id_id ON workspaces(org_id, id);

CREATE TABLE workspace_secret_preapprovals (
  org_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  secret_id TEXT NOT NULL,
  approved_by_user_id TEXT NOT NULL,
  approved_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, secret_id),
  FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, secret_id) REFERENCES org_secrets(org_id, id) ON DELETE CASCADE
);

CREATE TABLE session_secret_approvals (
  org_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  secret_id TEXT NOT NULL,
  approved_by_user_id TEXT NOT NULL,
  approved_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, session_id, secret_id),
  FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, secret_id) REFERENCES org_secrets(org_id, id) ON DELETE CASCADE
);

CREATE INDEX workspace_preapprovals_secret ON workspace_secret_preapprovals(secret_id);
CREATE INDEX session_approvals_secret ON session_secret_approvals(secret_id);

ALTER TABLE workspaces ADD COLUMN mac_access INTEGER NOT NULL DEFAULT 1 CHECK (mac_access IN (0, 1));
ALTER TABLE workspace_creation_plans ADD COLUMN capabilities_json TEXT;
