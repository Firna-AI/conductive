-- Chat, sessions, runner cursors, start steps, and banner state live in the
-- workspace Durable Object. D1 holds org records and resource ownership.

CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at INTEGER NOT NULL,
  UNIQUE (org_id, id)
);
CREATE UNIQUE INDEX sections_default ON sections(org_id) WHERE is_default = 1;

INSERT INTO sections (id, org_id, name, position, is_default, created_at)
SELECT 'general-' || id, id, 'General', 0, 1, created_at FROM orgs;

CREATE TABLE section_preferences (
  org_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  collapsed INTEGER NOT NULL DEFAULT 0 CHECK (collapsed IN (0, 1)),
  PRIMARY KEY (section_id, user_id),
  FOREIGN KEY (org_id, section_id) REFERENCES sections(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, user_id) REFERENCES org_members(org_id, user_id) ON DELETE CASCADE
);

ALTER TABLE orgs ADD COLUMN purge_after INTEGER;
ALTER TABLE repositories ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE repositories ADD COLUMN selected INTEGER NOT NULL DEFAULT 1;
ALTER TABLE boat_keys ADD COLUMN last_four TEXT;

ALTER TABLE workspaces ADD COLUMN section_id TEXT REFERENCES sections(id);
ALTER TABLE workspaces ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN created_by_workspace_id TEXT REFERENCES workspaces(id);
ALTER TABLE workspaces ADD COLUMN last_activity_at INTEGER;
ALTER TABLE workspaces ADD COLUMN stopped_at INTEGER;
ALTER TABLE workspaces ADD COLUMN next_disk_keepalive_at INTEGER;
ALTER TABLE workspaces ADD COLUMN runner_protocol_version INTEGER;
ALTER TABLE workspaces ADD COLUMN last_error_code TEXT;
ALTER TABLE workspaces ADD COLUMN last_error_message TEXT;
UPDATE workspaces SET section_id = 'general-' || org_id, last_activity_at = updated_at;
CREATE UNIQUE INDEX workspaces_org_id ON workspaces(org_id, id);
CREATE INDEX workspaces_section ON workspaces(org_id, section_id, position);
CREATE INDEX workspaces_keepalive ON workspaces(next_disk_keepalive_at);
CREATE INDEX workspaces_branch ON workspaces(repository_id, branch);
CREATE INDEX orgs_purge_after ON orgs(purge_after);

CREATE TABLE image_builds (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('build', 'refresh')),
  state TEXT NOT NULL CHECK (state IN ('running', 'succeeded', 'failed')),
  sandbox_id TEXT,
  snapshot_name TEXT,
  settings_revision INTEGER NOT NULL,
  runner_protocol_version INTEGER NOT NULL,
  started_by_user_id TEXT REFERENCES users(id),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  error TEXT,
  UNIQUE (org_id, id)
);
CREATE INDEX image_builds_org ON image_builds(org_id, started_at DESC);

CREATE TABLE image_build_logs (
  build_id TEXT NOT NULL REFERENCES image_builds(id) ON DELETE CASCADE,
  event_number INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (build_id, event_number)
);

ALTER TABLE settings ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN image_build_id TEXT REFERENCES image_builds(id);
ALTER TABLE settings ADD COLUMN last_refresh_at INTEGER;

CREATE TABLE workspace_tokens (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE terminal_credentials (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE workspace_read_states (
  workspace_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  through_event_number INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, user_id) REFERENCES org_members(org_id, user_id) ON DELETE CASCADE
);

CREATE TABLE workspace_views (
  workspace_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  view_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, user_id) REFERENCES org_members(org_id, user_id) ON DELETE CASCADE
);

CREATE TABLE preview_hostnames (
  id TEXT PRIMARY KEY,
  hostname TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  port INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (org_id, workspace_id) REFERENCES workspaces(org_id, id) ON DELETE CASCADE
);
CREATE INDEX preview_hostnames_workspace ON preview_hostnames(workspace_id);
CREATE INDEX preview_hostnames_expiry ON preview_hostnames(expires_at);

CREATE TABLE agent_logins (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent TEXT NOT NULL CHECK (agent IN ('claude', 'codex')),
  kind TEXT NOT NULL CHECK (kind IN ('token', 'api-key')),
  ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, agent),
  CHECK (agent = 'claude' OR kind = 'api-key')
);

CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_agent TEXT NOT NULL CHECK (default_agent IN ('claude', 'codex')),
  default_model TEXT NOT NULL,
  default_effort TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE org_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  github_login TEXT NOT NULL COLLATE NOCASE,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE (org_id, github_login)
);

CREATE TABLE github_installations (
  id INTEGER PRIMARY KEY,
  account_login TEXT NOT NULL,
  account_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  suspended_at INTEGER
);

-- The encrypted bundle records the sign-in connection. Its use by the git
-- credential helper still waits for decision 50 about token reach.
CREATE TABLE github_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE github_webhook_deliveries (
  delivery_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  processed_at INTEGER
);
