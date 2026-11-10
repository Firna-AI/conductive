ALTER TABLE workspace_creation_plans ADD COLUMN base_branch TEXT;
ALTER TABLE workspace_creation_plans ADD COLUMN start_sha TEXT;
ALTER TABLE workspaces ADD COLUMN base_branch TEXT;
