ALTER TABLE merge_queue_entries ADD COLUMN member_base TEXT;
ALTER TABLE merge_queue_entries ADD COLUMN merge_head TEXT;
ALTER TABLE merge_queue_entries ADD COLUMN refused_head TEXT;
ALTER TABLE merge_queue_entries ADD COLUMN blocking_pull_number INTEGER;

CREATE TABLE merge_queue_leave_notices (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  github_repository_id INTEGER NOT NULL,
  branch TEXT NOT NULL,
  pull_number INTEGER NOT NULL,
  base_branch TEXT NOT NULL
);
