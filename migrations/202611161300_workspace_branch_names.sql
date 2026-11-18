-- A new workspace branch takes the workspace name until the start creates it.
-- Existing rows keep their branches, so the placeholder starts at 0 for them.
ALTER TABLE workspaces ADD COLUMN branch_placeholder INTEGER NOT NULL DEFAULT 0
  CHECK (branch_placeholder IN (0, 1));

-- The number of the task of a workspace. Each Continue adds 1 and names its
-- branch with the version of the new task.
ALTER TABLE workspaces ADD COLUMN task_number INTEGER NOT NULL DEFAULT 1
  CHECK (task_number >= 1);
