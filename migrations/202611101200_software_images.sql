CREATE TABLE software_images (
  id TEXT PRIMARY KEY,
  provider_account TEXT NOT NULL,
  version TEXT NOT NULL,
  software_json TEXT NOT NULL,
  snapshot_name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('building', 'ready', 'failed', 'deleting')),
  phase TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  sandbox_id TEXT,
  process_id INTEGER,
  stdout_offset INTEGER NOT NULL DEFAULT 0,
  stderr_offset INTEGER NOT NULL DEFAULT 0,
  output TEXT NOT NULL DEFAULT '',
  error TEXT,
  token_digest TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  snapshot_recorded INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX software_images_building_account
  ON software_images (provider_account) WHERE state = 'building';
CREATE INDEX software_images_version
  ON software_images (provider_account, version, started_at DESC);

ALTER TABLE image_build_jobs ADD COLUMN software_image_name TEXT;
