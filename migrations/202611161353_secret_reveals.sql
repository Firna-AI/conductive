ALTER TABLE org_secrets ADD COLUMN value_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE org_secret_reveals (
  id INTEGER PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  secret_id TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  value_version INTEGER NOT NULL,
  revealed_by_user_id TEXT NOT NULL,
  revealed_at INTEGER NOT NULL
);

CREATE INDEX org_secret_reveals_latest
  ON org_secret_reveals(org_id, secret_id, value_version, id DESC);
