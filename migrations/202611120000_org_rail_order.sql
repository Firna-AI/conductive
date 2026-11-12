ALTER TABLE org_members ADD COLUMN rail_position INTEGER;

WITH places AS MATERIALIZED (
  SELECT m.org_id, m.user_id,
    ROW_NUMBER() OVER (PARTITION BY m.user_id ORDER BY o.created_at, o.id) - 1 AS position
  FROM org_members m JOIN orgs o ON o.id = m.org_id
)
UPDATE org_members SET rail_position = (
  SELECT position FROM places
  WHERE places.org_id = org_members.org_id AND places.user_id = org_members.user_id
);
