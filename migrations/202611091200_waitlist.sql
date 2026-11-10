ALTER TABLE users ADD COLUMN primary_verified_email TEXT;
ALTER TABLE users ADD COLUMN github_created_at INTEGER;

CREATE TABLE access_codes (
  code TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('invite', 'referral')),
  label TEXT,
  use_limit INTEGER NOT NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  disabled_at INTEGER
);
CREATE UNIQUE INDEX access_codes_owner ON access_codes(owner_user_id)
  WHERE kind = 'referral';

CREATE TABLE user_app_access (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'existing', 'operator', 'approval', 'invite_code', 'referral_code', 'org_invitation'
  )),
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  code TEXT REFERENCES access_codes(code),
  org_id TEXT,
  invitation_id TEXT,
  invited_by_user_id TEXT
);

CREATE TABLE access_code_uses (
  id INTEGER PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  code TEXT NOT NULL REFERENCES access_codes(code),
  used_at INTEGER NOT NULL
);
CREATE INDEX access_code_uses_code ON access_code_uses(code);

CREATE TABLE signup_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  paused INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
INSERT INTO signup_settings (id, paused) VALUES (1, 0);

INSERT INTO user_app_access (user_id, granted_at, source)
  SELECT id, created_at, 'existing' FROM users;

WITH RECURSIVE referral_codes (user_id, created_at, code, size) AS (
  SELECT user_id, granted_at, '', 0 FROM user_app_access
  UNION ALL
  SELECT user_id, created_at,
    code || substr('23456789ABCDEFGHJKMNPQRSTVWXYZ',
      abs(random() % 30) + 1, 1), size + 1
    FROM referral_codes WHERE size < 10
)
INSERT INTO access_codes (code, kind, use_limit, owner_user_id, created_at)
  SELECT code, 'referral', 5, user_id, created_at
    FROM referral_codes WHERE size = 10;
