-- The Stats tab of the account counts the records of one person. These
-- indexes let each count read only the rows of that person.
CREATE INDEX workspaces_owner ON workspaces(owner_user_id);
CREATE INDEX routines_owner_user ON routines(owner_user_id);
CREATE INDEX routine_runs_owner ON routine_runs(owner_user_id, created_at);
