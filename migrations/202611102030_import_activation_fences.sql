CREATE TABLE workspace_import_activation_attempts (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  attempt TEXT NOT NULL,
  epoch INTEGER NOT NULL,
  state TEXT NOT NULL,
  completed_at INTEGER
);
