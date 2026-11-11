CREATE TABLE workspace_runtime_with_imports (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT,
  first_turn_id TEXT,
  environment_ciphertext TEXT,
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  effort TEXT NOT NULL,
  first_message_id TEXT,
  repository_locations_json TEXT,
  UNIQUE (org_id, created_by_user_id, first_message_id)
);

INSERT INTO workspace_runtime_with_imports
  (workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
   environment_ciphertext, agent, model, effort, first_message_id, repository_locations_json)
SELECT workspace_id, org_id, created_by_user_id, session_id, first_turn_id,
  environment_ciphertext, agent, model, effort, first_message_id, repository_locations_json
FROM workspace_runtime;

DROP TABLE workspace_runtime;
ALTER TABLE workspace_runtime_with_imports RENAME TO workspace_runtime;

ALTER TABLE workspaces ADD COLUMN conductor_local_id TEXT;
ALTER TABLE workspaces ADD COLUMN imported_by_user_id TEXT;
ALTER TABLE workspaces ADD COLUMN activation_completed_at INTEGER;

CREATE UNIQUE INDEX workspaces_conductor_source
  ON workspaces(org_id, conductor_local_id) WHERE conductor_local_id IS NOT NULL;
