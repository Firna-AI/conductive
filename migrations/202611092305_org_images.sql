CREATE TABLE org_images (
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  provider_account TEXT NOT NULL,
  image_name TEXT,
  image_build_id TEXT REFERENCES image_builds(id),
  last_refresh_at INTEGER,
  last_push_refresh_at INTEGER,
  pending_push_refresh_at INTEGER,
  next_image_refresh_at INTEGER,
  PRIMARY KEY (org_id, provider_account)
);

CREATE INDEX org_images_account_name ON org_images(provider_account, image_name);

INSERT INTO org_images (
  org_id, provider_account, image_name, image_build_id, last_refresh_at,
  last_push_refresh_at, pending_push_refresh_at, next_image_refresh_at
)
SELECT s.org_id, COALESCE(b.provider_account, 'boat'), s.org_image_name,
  s.image_build_id, s.last_refresh_at, s.last_push_refresh_at,
  s.pending_push_refresh_at, s.next_image_refresh_at
FROM settings s LEFT JOIN image_builds b ON b.id = s.image_build_id;

ALTER TABLE settings DROP COLUMN org_image_name;
ALTER TABLE settings DROP COLUMN image_build_id;
ALTER TABLE settings DROP COLUMN last_refresh_at;
ALTER TABLE settings DROP COLUMN last_push_refresh_at;
ALTER TABLE settings DROP COLUMN pending_push_refresh_at;
ALTER TABLE settings DROP COLUMN next_image_refresh_at;
