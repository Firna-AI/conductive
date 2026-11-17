ALTER TABLE workspaces ADD COLUMN github_state TEXT
  CHECK (github_state IN (
    'checks-running', 'checks-failed', 'ready-to-merge', 'merged',
    'conflict', 'changes-requested', 'draft', 'blocked'
  ));

UPDATE workspaces SET github_state = CASE github_summary
  WHEN 'checks-passed' THEN 'ready-to-merge'
  ELSE github_summary
END;

ALTER TABLE workspaces DROP COLUMN github_summary;

ALTER TABLE workspaces RENAME COLUMN github_state TO github_summary;
