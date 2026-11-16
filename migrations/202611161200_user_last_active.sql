-- The time of the last real action of each person: a new workspace or a
-- chat message that the person sends from the app. Existing users start
-- from their newest owned workspace, because chat messages live in the
-- workspace objects. A user with no workspace keeps NULL.
ALTER TABLE users ADD COLUMN last_active_at INTEGER;

UPDATE users SET last_active_at = (
  SELECT MAX(w.created_at) FROM workspaces w WHERE w.owner_user_id = users.id
);
