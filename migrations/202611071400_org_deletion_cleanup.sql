CREATE TABLE org_deletions (
  org_id TEXT PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  suspended_at INTEGER,
  purge_started_at INTEGER,
  lease_token TEXT,
  lease_until INTEGER
);

CREATE TABLE org_deletion_resources (
  org_id TEXT NOT NULL REFERENCES org_deletions(org_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sandbox', 'snapshot')),
  resource_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  stopped_at INTEGER,
  removed_at INTEGER,
  PRIMARY KEY (org_id, kind, resource_id)
);

CREATE TABLE org_deletion_workspaces (
  org_id TEXT NOT NULL REFERENCES org_deletions(org_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  state_deleted_at INTEGER,
  PRIMARY KEY (org_id, workspace_id)
);
