-- A GitHub login cannot establish an email address. Discard these invitations.
DROP TRIGGER org_member_departure_invites;
DROP TABLE org_invites;

CREATE TABLE user_verified_emails (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL COLLATE NOCASE,
  PRIMARY KEY (user_id, email)
);

CREATE TABLE org_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email TEXT NOT NULL COLLATE NOCASE,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  UNIQUE (org_id, email)
);

-- Remember verified matches independently of later changes to current emails.
CREATE TABLE org_invite_users (
  invite_id TEXT NOT NULL REFERENCES org_invites(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (invite_id, user_id)
);

CREATE INDEX org_invite_users_by_user ON org_invite_users(user_id, invite_id);

-- These matches share the invitation insert and the sign-in email batch.
CREATE TRIGGER org_invite_verified_users
AFTER INSERT ON org_invites
BEGIN
  INSERT OR IGNORE INTO org_invite_users (invite_id, user_id)
  SELECT NEW.id, user_id FROM user_verified_emails WHERE email = NEW.email;
END;

CREATE TRIGGER verified_email_org_invites
AFTER INSERT ON user_verified_emails
BEGIN
  INSERT OR IGNORE INTO org_invite_users (invite_id, user_id)
  SELECT id, NEW.user_id FROM org_invites WHERE email = NEW.email;
END;

CREATE TRIGGER org_member_departure_invites
AFTER DELETE ON org_members
BEGIN
  DELETE FROM org_invites
  WHERE org_id = OLD.org_id
    AND id IN (
      SELECT invite_id FROM org_invite_users WHERE user_id = OLD.user_id
    );
END;
