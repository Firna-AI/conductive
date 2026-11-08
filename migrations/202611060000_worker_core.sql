CREATE TABLE users (
  id TEXT PRIMARY KEY,
  github_id INTEGER NOT NULL UNIQUE,
  github_login TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX oauth_states_expiry ON oauth_states(expires_at);

CREATE TABLE orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creator_user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE TABLE org_members (
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX org_members_user ON org_members(user_id);

CREATE TABLE boat_keys (
  org_id TEXT PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('personal', 'org')),
  ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  github_repository_id INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  default_branch TEXT NOT NULL,
  installation_id INTEGER,
  UNIQUE (org_id, id),
  UNIQUE (org_id, github_repository_id)
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  sandbox_id TEXT UNIQUE,
  state TEXT NOT NULL DEFAULT 'starting',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER,
  FOREIGN KEY (org_id, repository_id) REFERENCES repositories(org_id, id),
  FOREIGN KEY (org_id, owner_user_id) REFERENCES org_members(org_id, user_id)
);
CREATE INDEX workspaces_org ON workspaces(org_id);

CREATE TABLE settings (
  org_id TEXT PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  install_script TEXT NOT NULL DEFAULT '',
  startup_script TEXT NOT NULL DEFAULT '',
  env_vars_ciphertext TEXT,
  org_image_name TEXT,
  updated_at INTEGER NOT NULL
);
