CREATE TABLE suspension_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('user', 'org')),
  target_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('suspend', 'lift')),
  occurred_at INTEGER NOT NULL,
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX suspension_events_target
  ON suspension_events(target_kind, target_id, id);

INSERT INTO suspension_events
  (target_kind, target_id, action, occurred_at, operator_user_id)
SELECT 'user', id, 'suspend', suspended_at, suspended_by_user_id
FROM users WHERE suspended_at IS NOT NULL;

INSERT INTO suspension_events
  (target_kind, target_id, action, occurred_at, operator_user_id)
SELECT 'org', id, 'suspend', suspended_at, suspended_by_user_id
FROM orgs WHERE suspended_at IS NOT NULL;
