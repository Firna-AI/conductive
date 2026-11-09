ALTER TABLE workspace_creation_attempts ADD COLUMN error_code TEXT;
ALTER TABLE workspace_creation_attempts ADD COLUMN error_message TEXT;

ALTER TABLE routine_runs ADD COLUMN owner_user_id TEXT REFERENCES users(id);
UPDATE routine_runs SET owner_user_id = (
  SELECT owner_user_id FROM routines WHERE routines.id = routine_runs.routine_id
);

CREATE INDEX routine_runs_message ON routine_runs(org_id, message_id);
CREATE INDEX workspace_creation_attempts_message
  ON workspace_creation_attempts(org_id, first_message_id, created_at DESC, workspace_id DESC);
