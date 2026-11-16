-- The Stats tab of the account counts the records of one person. These
-- indexes let each count read only the rows of that person.
CREATE INDEX workspaces_owner ON workspaces(owner_user_id);
CREATE INDEX automations_owner_user ON automations(owner_user_id);
CREATE INDEX automation_runs_owner ON automation_runs(owner_user_id, created_at);
