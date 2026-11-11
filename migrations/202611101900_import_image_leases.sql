CREATE TABLE workspace_import_image_leases (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  snapshot_name TEXT NOT NULL,
  provider_account TEXT NOT NULL
);

CREATE INDEX workspace_import_image_leases_snapshot
  ON workspace_import_image_leases(org_id, provider_account, snapshot_name);
