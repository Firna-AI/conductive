ALTER TABLE repositories ADD COLUMN position INTEGER;

WITH places AS MATERIALIZED (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY org_id ORDER BY lower(full_name), full_name, id
    ) - 1 AS position
  FROM repositories WHERE selected = 1
)
UPDATE repositories SET position = (
  SELECT places.position FROM places WHERE places.id = repositories.id
)
WHERE selected = 1;
