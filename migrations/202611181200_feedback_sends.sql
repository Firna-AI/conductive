CREATE TABLE feedback_sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_key TEXT NOT NULL,
  first_attempt_at INTEGER NOT NULL,
  reserved_at INTEGER NOT NULL,
  generation TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'uncertain', 'sent')),
  active_requests INTEGER NOT NULL CHECK (active_requests >= 0)
);

CREATE INDEX feedback_sends_delivery
  ON feedback_sends(user_id, delivery_key, first_attempt_at);
CREATE INDEX feedback_sends_quota
  ON feedback_sends(user_id, reserved_at);
CREATE INDEX feedback_sends_expiry
  ON feedback_sends(first_attempt_at);
