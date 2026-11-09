CREATE TABLE user_preferences_new (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_agent TEXT CHECK (default_agent IN ('claude', 'codex')),
  default_model TEXT,
  default_effort TEXT,
  new_workspace_view TEXT CHECK (new_workspace_view IN ('page', 'dialog')),
  updated_at INTEGER NOT NULL,
  CHECK (
    (default_agent IS NULL AND default_model IS NULL AND default_effort IS NULL)
    OR
    (default_agent IS NOT NULL AND default_model IS NOT NULL AND default_effort IS NOT NULL)
  )
);

INSERT INTO user_preferences_new
  (user_id, default_agent, default_model, default_effort, updated_at)
SELECT user_id, default_agent, default_model, default_effort, updated_at
FROM user_preferences;

DROP TABLE user_preferences;
ALTER TABLE user_preferences_new RENAME TO user_preferences;
