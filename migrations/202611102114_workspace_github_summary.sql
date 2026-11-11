ALTER TABLE workspaces ADD COLUMN github_summary TEXT
  CHECK (github_summary IN ('checks-running', 'checks-failed', 'checks-passed', 'merged'));
