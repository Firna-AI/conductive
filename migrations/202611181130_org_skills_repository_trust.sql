ALTER TABLE settings ADD COLUMN trusted_skills_repository TEXT NOT NULL DEFAULT '';

CREATE TRIGGER settings_clear_replaced_skills_trust
AFTER UPDATE OF skills_repository ON settings
WHEN NEW.skills_repository COLLATE NOCASE != OLD.skills_repository
 AND NEW.trusted_skills_repository != ''
 AND (NEW.trusted_skills_repository COLLATE NOCASE = OLD.trusted_skills_repository
      OR NEW.trusted_skills_repository COLLATE NOCASE != NEW.skills_repository)
BEGIN
  UPDATE settings SET trusted_skills_repository = '' WHERE org_id = NEW.org_id;
END;
