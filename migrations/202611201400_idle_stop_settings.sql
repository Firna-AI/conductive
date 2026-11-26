CREATE TABLE idle_stop_settings (
  id INTEGER PRIMARY KEY,
  minutes INTEGER NOT NULL,
  updated_at INTEGER,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO idle_stop_settings (id, minutes) VALUES (1, 30);

CREATE TABLE idle_stop_events (
  id INTEGER PRIMARY KEY,
  minutes INTEGER NOT NULL,
  changed_at INTEGER NOT NULL,
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
