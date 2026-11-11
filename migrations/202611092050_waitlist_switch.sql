ALTER TABLE signup_settings ADD COLUMN waitlist_on INTEGER NOT NULL DEFAULT 1;
ALTER TABLE signup_settings ADD COLUMN waitlist_updated_at INTEGER;
ALTER TABLE signup_settings ADD COLUMN waitlist_updated_by_user_id TEXT
  REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE user_app_access_new (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'existing', 'operator', 'approval', 'invite_code', 'referral_code', 'org_invitation', 'open_signup'
  )),
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  code TEXT REFERENCES access_codes(code),
  org_id TEXT,
  invitation_id TEXT,
  invited_by_user_id TEXT
);

INSERT INTO user_app_access_new
  (user_id, granted_at, source, operator_user_id, code, org_id, invitation_id, invited_by_user_id)
SELECT user_id, granted_at, source, operator_user_id, code, org_id, invitation_id, invited_by_user_id
FROM user_app_access;

DROP TABLE user_app_access;
ALTER TABLE user_app_access_new RENAME TO user_app_access;
