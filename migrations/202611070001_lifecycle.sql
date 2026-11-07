CREATE TABLE workspace_runtime (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  first_turn_id TEXT NOT NULL,
  environment_ciphertext TEXT,
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  effort TEXT NOT NULL,
  first_message_id TEXT NOT NULL,
  UNIQUE (org_id, created_by_user_id, first_message_id)
);

CREATE UNIQUE INDEX image_builds_running ON image_builds(org_id)
  WHERE state = 'running';

ALTER TABLE settings ADD COLUMN next_image_refresh_at INTEGER;
ALTER TABLE settings ADD COLUMN last_push_refresh_at INTEGER;
ALTER TABLE settings ADD COLUMN pending_push_refresh_at INTEGER;

CREATE TABLE image_build_jobs (
  build_id TEXT PRIMARY KEY REFERENCES image_builds(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  process_id INTEGER,
  stdout_offset INTEGER NOT NULL DEFAULT 0,
  stderr_offset INTEGER NOT NULL DEFAULT 0,
  install_script TEXT NOT NULL,
  repositories_json TEXT NOT NULL,
  software_json TEXT NOT NULL,
  previous_image_name TEXT
);

CREATE TABLE lifecycle_sandbox_cleanup (
  workspace_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sandbox_id TEXT NOT NULL
);

CREATE TABLE workspace_retention (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  error TEXT
);

-- Hidden attempts index failed actor drafts without exposing a workspace row.
CREATE TABLE workspace_creation_attempts (
  workspace_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id),
  first_message_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
CREATE INDEX workspace_creation_attempts_org ON workspace_creation_attempts(org_id);

CREATE TABLE image_leases (
  workspace_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  snapshot_name TEXT NOT NULL,
  FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE
);
CREATE INDEX image_leases_snapshot ON image_leases(org_id, snapshot_name);
