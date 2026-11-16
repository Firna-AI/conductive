-- The time of the last real action of each person: a new workspace or a
-- chat message that the person sends from the app.
ALTER TABLE users ADD COLUMN last_active_at INTEGER;

-- Existing users start from the newest workspace that they created in the
-- app. Chat messages live in the workspace objects, so this cannot read
-- them. A workspace of an agent tool or of a routine run does not count.
-- The app makes each first message ID with crypto.randomUUID(), 36
-- characters. Routine runs and agent tools make 43-character IDs. The ID
-- form stays after a routine delete removes its runs, so it is the main
-- test, and the run and parent checks stay as a second guard.
-- A workspace after the end of the last sign-in session does not count
-- either, because no session of the person could create it: a session
-- lasts 7 days from the sign-in that users.updated_at records. A user with
-- no such workspace keeps NULL.
UPDATE users SET last_active_at = (
  SELECT MAX(w.created_at)
  FROM workspaces w
  JOIN workspace_runtime r ON r.workspace_id = w.id
  WHERE r.created_by_user_id = users.id
    AND length(r.first_message_id) = 36
    AND w.created_by_workspace_id IS NULL
    AND w.created_at <= users.updated_at + 7 * 86400000 + 60000
    AND NOT EXISTS (
      SELECT 1 FROM routine_runs rr
      WHERE rr.workspace_id = w.id
        OR (rr.org_id = r.org_id AND rr.message_id = r.first_message_id)
    )
);
