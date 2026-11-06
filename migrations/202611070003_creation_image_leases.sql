-- A durable claim holds its snapshot before a workspace row exists.
CREATE UNIQUE INDEX workspace_creation_attempts_org_id
  ON workspace_creation_attempts(org_id, workspace_id);

CREATE TABLE image_claim_leases (
  workspace_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  snapshot_name TEXT NOT NULL,
  FOREIGN KEY (org_id, workspace_id)
    REFERENCES workspace_creation_attempts(org_id, workspace_id) ON DELETE CASCADE
);
INSERT INTO image_claim_leases (workspace_id, org_id, snapshot_name)
  SELECT workspace_id, org_id, snapshot_name FROM image_leases;
DROP TABLE image_leases;
ALTER TABLE image_claim_leases RENAME TO image_leases;
CREATE INDEX image_leases_snapshot ON image_leases(org_id, snapshot_name);

-- Keep the old workspace-delete cleanup and cover failures before insertion.
CREATE TRIGGER image_leases_workspace_deleted AFTER DELETE ON workspaces
BEGIN
  DELETE FROM image_leases WHERE workspace_id = OLD.id AND org_id = OLD.org_id;
END;
CREATE TRIGGER image_leases_creation_finished
AFTER UPDATE OF state ON workspace_creation_attempts
WHEN NEW.state != 'pending'
BEGIN
  DELETE FROM image_leases WHERE workspace_id = NEW.workspace_id AND org_id = NEW.org_id;
END;
