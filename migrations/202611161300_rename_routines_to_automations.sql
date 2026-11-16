-- The product renamed routines to automations. The tables, the column,
-- and the indexes take the new name. The rows stay as they are.
ALTER TABLE routines RENAME TO automations;
ALTER TABLE routine_runs RENAME TO automation_runs;
ALTER TABLE automation_runs RENAME COLUMN routine_id TO automation_id;

DROP INDEX routines_due;
DROP INDEX routines_repository;
DROP INDEX routines_owner;
CREATE INDEX automations_due ON automations(next_run_at) WHERE active = 1;
CREATE INDEX automations_repository ON automations(org_id, repository_id);
CREATE INDEX automations_owner ON automations(org_id, owner_user_id);

DROP INDEX routine_runs_key;
DROP INDEX routine_runs_recent;
DROP INDEX routine_runs_workspace;
DROP INDEX routine_runs_queued;
DROP INDEX routine_runs_message;
CREATE UNIQUE INDEX automation_runs_key ON automation_runs(run_key);
CREATE INDEX automation_runs_recent ON automation_runs(automation_id, created_at DESC, id DESC);
CREATE INDEX automation_runs_workspace ON automation_runs(workspace_id);
CREATE INDEX automation_runs_queued ON automation_runs(state, created_at);
CREATE INDEX automation_runs_message ON automation_runs(org_id, message_id);

-- Stored names and failure texts use the new word, as new rows do.
UPDATE automations SET name = 'Untitled automation' WHERE name = 'Untitled routine';
UPDATE automation_runs
SET error_code = REPLACE(error_code, 'routine', 'automation'),
  error_message = REPLACE(error_message, 'routine', 'automation')
WHERE error_code LIKE '%routine%' OR error_message LIKE '%routine%';
UPDATE workspace_creation_attempts
SET error_code = REPLACE(error_code, 'routine', 'automation'),
  error_message = REPLACE(error_message, 'routine', 'automation')
WHERE error_code LIKE '%routine%' OR error_message LIKE '%routine%';
