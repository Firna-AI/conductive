CREATE TRIGGER org_member_departure_invites
AFTER DELETE ON org_members
BEGIN
  DELETE FROM org_invites
  WHERE org_id = OLD.org_id
    AND github_login = (
      SELECT github_login FROM users WHERE id = OLD.user_id
    ) COLLATE NOCASE;
END;
