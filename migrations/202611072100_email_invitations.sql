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

CREATE TRIGGER org_member_departure_invites
AFTER DELETE ON org_members
BEGIN
  DELETE FROM org_invites
  WHERE org_id = OLD.org_id
    AND email IN (
      SELECT email FROM user_verified_emails WHERE user_id = OLD.user_id
    );
END;
