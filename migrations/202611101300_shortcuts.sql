CREATE TABLE user_shortcuts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyboard TEXT NOT NULL CHECK (keyboard IN ('mac', 'other')),
  command TEXT NOT NULL,
  keys_json TEXT NOT NULL,
  PRIMARY KEY (user_id, keyboard, command)
);
