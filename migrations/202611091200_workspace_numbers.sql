ALTER TABLE orgs ADD COLUMN workspace_number_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN number INTEGER NOT NULL DEFAULT 0;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY org_id ORDER BY created_at, id) AS number
  FROM workspaces
)
UPDATE workspaces SET number = (SELECT number FROM numbered WHERE numbered.id = workspaces.id);

UPDATE orgs SET workspace_number_count = COALESCE(
  (SELECT MAX(number) FROM workspaces WHERE org_id = orgs.id), 0
);

CREATE UNIQUE INDEX workspaces_org_number ON workspaces(org_id, number);

CREATE TRIGGER workspaces_allocate_number AFTER INSERT ON workspaces
BEGIN
  UPDATE orgs SET workspace_number_count = workspace_number_count + 1
    WHERE id = NEW.org_id;
  UPDATE workspaces SET number = (
    SELECT workspace_number_count FROM orgs WHERE id = NEW.org_id
  ) WHERE id = NEW.id;
END;
