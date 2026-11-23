CREATE TABLE merge_queues (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  github_repository_id INTEGER NOT NULL,
  trunk TEXT NOT NULL,
  github_stack_number INTEGER,
  pending_write TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  stepped_at INTEGER,
  UNIQUE (org_id, repository_id),
  FOREIGN KEY (org_id, repository_id) REFERENCES repositories(org_id, id) ON DELETE CASCADE
);
CREATE INDEX merge_queues_github_repository ON merge_queues(github_repository_id);

CREATE TABLE merge_queue_entries (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  queue_id TEXT NOT NULL REFERENCES merge_queues(id) ON DELETE CASCADE,
  branch TEXT NOT NULL,
  pull_number INTEGER NOT NULL,
  queuer_user_id TEXT NOT NULL,
  place INTEGER NOT NULL,
  unit_id TEXT NOT NULL,
  state TEXT NOT NULL,
  wait_reason TEXT,
  queued_at INTEGER NOT NULL,
  step_at INTEGER NOT NULL,
  UNIQUE (queue_id, pull_number)
);
CREATE INDEX merge_queue_entries_order ON merge_queue_entries(queue_id, place);
