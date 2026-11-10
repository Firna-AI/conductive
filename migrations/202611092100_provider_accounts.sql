ALTER TABLE workspaces ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE image_builds ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE image_build_jobs ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE lifecycle_sandbox_cleanup ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE image_leases ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE workspace_creation_plans ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE image_source_jobs ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE org_deletion_resources ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE terminal_credentials ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';
ALTER TABLE preview_hostnames ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';

PRAGMA defer_foreign_keys = ON;

-- D1 keeps cascading deletes active while it defers foreign keys.
-- Save each workspace child before replacing the global sandbox uniqueness.
CREATE TABLE provider_account_workspace_runtime AS SELECT * FROM workspace_runtime;
CREATE TABLE provider_account_workspace_tokens AS SELECT * FROM workspace_tokens;
CREATE TABLE provider_account_terminal_credentials AS SELECT * FROM terminal_credentials;
CREATE TABLE provider_account_workspace_read_states AS SELECT * FROM workspace_read_states;
CREATE TABLE provider_account_workspace_views AS SELECT * FROM workspace_views;
CREATE TABLE provider_account_preview_hostnames AS SELECT * FROM preview_hostnames;
CREATE TABLE provider_account_workspace_retention AS SELECT * FROM workspace_retention;
CREATE TABLE provider_account_org_deletion_workspaces AS SELECT * FROM org_deletion_workspaces;

DROP TRIGGER image_leases_workspace_deleted;
DROP TRIGGER workspaces_allocate_number;

CREATE TABLE workspaces_with_provider_account (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  sandbox_id TEXT,
  state TEXT NOT NULL DEFAULT 'starting',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER,
  section_id TEXT REFERENCES sections(id),
  position INTEGER NOT NULL DEFAULT 0,
  created_by_workspace_id TEXT REFERENCES workspaces_with_provider_account(id),
  last_activity_at INTEGER,
  stopped_at INTEGER,
  next_disk_keepalive_at INTEGER,
  runner_protocol_version INTEGER,
  last_error_code TEXT,
  last_error_message TEXT,
  number INTEGER NOT NULL DEFAULT 0,
  provider_account TEXT NOT NULL DEFAULT 'boat',
  FOREIGN KEY (org_id, repository_id) REFERENCES repositories(org_id, id),
  FOREIGN KEY (org_id, owner_user_id) REFERENCES org_members(org_id, user_id)
);

INSERT INTO workspaces_with_provider_account
  (id, org_id, repository_id, owner_user_id, name, branch, sandbox_id, state,
   created_at, updated_at, archived_at, section_id, position, created_by_workspace_id,
   last_activity_at, stopped_at, next_disk_keepalive_at, runner_protocol_version,
   last_error_code, last_error_message, number, provider_account)
SELECT id, org_id, repository_id, owner_user_id, name, branch, sandbox_id, state,
  created_at, updated_at, archived_at, section_id, position, created_by_workspace_id,
  last_activity_at, stopped_at, next_disk_keepalive_at, runner_protocol_version,
  last_error_code, last_error_message, number, provider_account FROM workspaces;

DROP TABLE workspaces;
ALTER TABLE workspaces_with_provider_account RENAME TO workspaces;

CREATE INDEX workspaces_org ON workspaces(org_id);
CREATE UNIQUE INDEX workspaces_org_id ON workspaces(org_id, id);
CREATE INDEX workspaces_section ON workspaces(org_id, section_id, position);
CREATE INDEX workspaces_keepalive ON workspaces(next_disk_keepalive_at);
CREATE INDEX workspaces_branch ON workspaces(repository_id, branch);
CREATE UNIQUE INDEX workspaces_org_number ON workspaces(org_id, number);
CREATE UNIQUE INDEX workspaces_provider_sandbox ON workspaces(provider_account, sandbox_id);

INSERT INTO workspace_runtime SELECT * FROM provider_account_workspace_runtime;
INSERT INTO workspace_tokens SELECT * FROM provider_account_workspace_tokens;
INSERT INTO terminal_credentials SELECT * FROM provider_account_terminal_credentials;
INSERT INTO workspace_read_states SELECT * FROM provider_account_workspace_read_states;
INSERT INTO workspace_views SELECT * FROM provider_account_workspace_views;
INSERT INTO preview_hostnames SELECT * FROM provider_account_preview_hostnames;
INSERT INTO workspace_retention SELECT * FROM provider_account_workspace_retention;
INSERT INTO org_deletion_workspaces SELECT * FROM provider_account_org_deletion_workspaces;

DROP TABLE provider_account_workspace_runtime;
DROP TABLE provider_account_workspace_tokens;
DROP TABLE provider_account_terminal_credentials;
DROP TABLE provider_account_workspace_read_states;
DROP TABLE provider_account_workspace_views;
DROP TABLE provider_account_preview_hostnames;
DROP TABLE provider_account_workspace_retention;
DROP TABLE provider_account_org_deletion_workspaces;

-- Existing numbers and the org counter stay unchanged during the copy.
CREATE TRIGGER workspaces_allocate_number AFTER INSERT ON workspaces
BEGIN
  UPDATE orgs SET workspace_number_count = workspace_number_count + 1
    WHERE id = NEW.org_id;
  UPDATE workspaces SET number = (
    SELECT workspace_number_count FROM orgs WHERE id = NEW.org_id
  ) WHERE id = NEW.id;
END;

CREATE TRIGGER image_leases_workspace_deleted AFTER DELETE ON workspaces
BEGIN
  DELETE FROM image_leases WHERE workspace_id = OLD.id AND org_id = OLD.org_id;
END;

CREATE TABLE org_deletion_resources_with_provider_account (
  org_id TEXT NOT NULL REFERENCES org_deletions(org_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sandbox', 'snapshot')),
  resource_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  stopped_at INTEGER,
  removed_at INTEGER,
  provider_account TEXT NOT NULL DEFAULT 'boat',
  PRIMARY KEY (org_id, kind, provider_account, resource_id)
);
INSERT INTO org_deletion_resources_with_provider_account
  (org_id, kind, resource_id, sort_order, stopped_at, removed_at, provider_account)
SELECT org_id, kind, resource_id, sort_order, stopped_at, removed_at, provider_account
FROM org_deletion_resources;
DROP TABLE org_deletion_resources;
ALTER TABLE org_deletion_resources_with_provider_account RENAME TO org_deletion_resources;

DROP INDEX image_leases_snapshot;
CREATE INDEX image_leases_snapshot ON image_leases(org_id, provider_account, snapshot_name);

PRAGMA defer_foreign_keys = OFF;
