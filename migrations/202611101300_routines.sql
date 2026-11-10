CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  moved_from_name TEXT,
  name TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  effort TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  inactive_reason TEXT,
  failed_runs_in_a_row INTEGER NOT NULL DEFAULT 0,
  time_zone TEXT NOT NULL,
  triggers_json TEXT NOT NULL,
  next_run_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (org_id, id)
);

CREATE INDEX routines_due ON routines(next_run_at) WHERE active = 1;
CREATE INDEX routines_repository ON routines(org_id, repository_id);
CREATE INDEX routines_owner ON routines(org_id, owner_user_id);

CREATE TABLE routine_runs (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  run_key TEXT NOT NULL,
  message_id TEXT NOT NULL,
  trigger_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  workspace_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (org_id, routine_id) REFERENCES routines(org_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX routine_runs_key ON routine_runs(run_key);
CREATE INDEX routine_runs_recent ON routine_runs(routine_id, created_at DESC, id DESC);
CREATE INDEX routine_runs_workspace ON routine_runs(workspace_id);
CREATE INDEX routine_runs_queued ON routine_runs(state, created_at);
