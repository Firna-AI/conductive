ALTER TABLE orgs ADD COLUMN provider_account TEXT NOT NULL DEFAULT 'boat';

CREATE TABLE provider_assignment_settings (
  id INTEGER PRIMARY KEY,
  weights_json TEXT NOT NULL,
  updated_at INTEGER,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO provider_assignment_settings (id, weights_json)
  VALUES (1, '{"boat":100}');

CREATE TABLE provider_assignment_events (
  id INTEGER PRIMARY KEY,
  weights_json TEXT NOT NULL,
  changed_at INTEGER NOT NULL,
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
