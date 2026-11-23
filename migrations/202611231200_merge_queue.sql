CREATE TABLE merge_queues (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  github_repository_id INTEGER NOT NULL,
  trunk TEXT NOT NULL,
  trunk_pull_number INTEGER,
  github_stack_number INTEGER,
  stack_writer_user_id TEXT,
  stack_cleanup_workspace_id TEXT,
  stack_cleanup_actor_user_id TEXT,
  rebuild_stack INTEGER NOT NULL DEFAULT 0,
  creating_stack INTEGER NOT NULL DEFAULT 0,
  reordering INTEGER NOT NULL DEFAULT 0,
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
  member_base TEXT,
  merge_head TEXT,
  refused_head TEXT,
  blocking_pull_number INTEGER,
  old_base_sha TEXT,
  old_base_head TEXT,
  github_base TEXT,
  pending_base TEXT,
  observed_head TEXT,
  sync_from TEXT,
  UNIQUE (queue_id, pull_number)
);
CREATE INDEX merge_queue_entries_order ON merge_queue_entries(queue_id, place);

CREATE TABLE merge_queue_leave_notices (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  github_repository_id INTEGER NOT NULL,
  branch TEXT NOT NULL,
  pull_number INTEGER NOT NULL,
  base_branch TEXT NOT NULL
);

CREATE TABLE merge_queue_list_facts (
  org_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  binding TEXT NOT NULL,
  payload TEXT,
  generation INTEGER NOT NULL DEFAULT 0,
  fresh_until INTEGER NOT NULL DEFAULT 0,
  retry_at INTEGER NOT NULL,
  claim_until INTEGER NOT NULL,
  claim_id TEXT,
  retain_until INTEGER NOT NULL,
  PRIMARY KEY (org_id, repository_id, viewer_id),
  FOREIGN KEY (org_id, repository_id) REFERENCES repositories(org_id, id) ON DELETE CASCADE
);
CREATE INDEX merge_queue_list_facts_retention ON merge_queue_list_facts(retain_until);
