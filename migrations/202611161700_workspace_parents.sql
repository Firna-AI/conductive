ALTER TABLE workspaces ADD COLUMN parent_workspace_id TEXT REFERENCES workspaces(id);

CREATE INDEX workspaces_org_parent ON workspaces (org_id, parent_workspace_id);

ALTER TABLE workspace_creation_plans ADD COLUMN parent_workspace_id TEXT;
