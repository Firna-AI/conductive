CREATE TABLE approval_emails (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('none', 'pending', 'sent', 'failed')),
  recipient TEXT,
  subject TEXT,
  body TEXT,
  approved_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX approval_emails_pending ON approval_emails(approved_at)
  WHERE state = 'pending';

ALTER TABLE access_codes ADD COLUMN disabled_by_user_id TEXT
  REFERENCES users(id) ON DELETE SET NULL;
