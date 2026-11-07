-- Keep every attempt for draft recovery. Retire duplicate pending reservations.
UPDATE workspace_creation_attempts SET state = 'failed'
WHERE workspace_id IN (
  SELECT workspace_id FROM (
    SELECT a.workspace_id,
      ROW_NUMBER() OVER (
        PARTITION BY a.org_id, a.sender_user_id, a.first_message_id
        ORDER BY CASE WHEN r.workspace_id IS NULL THEN 1 ELSE 0 END,
          a.created_at, a.workspace_id
      ) AS position
    FROM workspace_creation_attempts a
    LEFT JOIN workspace_runtime r ON r.workspace_id = a.workspace_id
    WHERE a.state = 'pending'
  ) WHERE position > 1
);
CREATE UNIQUE INDEX workspace_creation_pending
  ON workspace_creation_attempts(org_id, sender_user_id, first_message_id)
  WHERE state = 'pending';

CREATE TABLE workspace_creation_plans (
  workspace_id TEXT PRIMARY KEY REFERENCES workspace_creation_attempts(workspace_id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  section_id TEXT,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  city TEXT NOT NULL,
  branch TEXT NOT NULL,
  start_attempt TEXT NOT NULL,
  startup_script TEXT NOT NULL,
  environment_ciphertext TEXT,
  image_name TEXT,
  default_branch TEXT NOT NULL,
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  effort TEXT NOT NULL,
  attachment_ids_json TEXT NOT NULL
);
