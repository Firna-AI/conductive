ALTER TABLE workspaces ADD COLUMN running_since INTEGER;

CREATE INDEX workspaces_running_since ON workspaces(running_since)
WHERE archived_at IS NULL
  AND state IN ('starting', 'ready', 'working', 'unread', 'input')
  AND running_since IS NOT NULL;
