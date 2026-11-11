CREATE TABLE conductor_import_reservations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  importer_user_id TEXT NOT NULL,
  repository_id TEXT NOT NULL,
  local_workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  source_fingerprint TEXT,
  snapshot_json TEXT,
  manifest_count INTEGER NOT NULL DEFAULT 0,
  manifest_closed INTEGER NOT NULL DEFAULT 0,
  stored_bytes INTEGER NOT NULL DEFAULT 0,
  replacement_id TEXT
);
CREATE UNIQUE INDEX conductor_import_source
  ON conductor_import_reservations(org_id, local_workspace_id)
  WHERE state IN ('open', 'complete');
CREATE INDEX conductor_import_expiry
  ON conductor_import_reservations(state, expires_at);

CREATE TABLE conductor_import_manifest (
  reservation_id TEXT NOT NULL REFERENCES conductor_import_reservations(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  kind TEXT NOT NULL,
  record_key TEXT NOT NULL,
  path TEXT,
  json TEXT NOT NULL,
  PRIMARY KEY(reservation_id, ordinal),
  UNIQUE(reservation_id, kind, record_key)
);
CREATE UNIQUE INDEX conductor_import_paths
  ON conductor_import_manifest(reservation_id, path) WHERE path IS NOT NULL;

CREATE TABLE conductor_import_objects (
  reservation_id TEXT NOT NULL REFERENCES conductor_import_reservations(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  encoding TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  restored_bytes INTEGER NOT NULL,
  part_count INTEGER NOT NULL,
  PRIMARY KEY(reservation_id, id)
);

CREATE TABLE conductor_import_parts (
  reservation_id TEXT NOT NULL REFERENCES conductor_import_reservations(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  part_index INTEGER NOT NULL,
  ordinal INTEGER NOT NULL,
  group_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  target_json TEXT,
  target_expires_at INTEGER,
  verified INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(reservation_id, id),
  UNIQUE(reservation_id, object_id, part_index)
);
CREATE INDEX conductor_import_missing
  ON conductor_import_parts(reservation_id, verified, ordinal);

CREATE TABLE conductor_import_targets (
  reservation_id TEXT NOT NULL REFERENCES conductor_import_reservations(id) ON DELETE CASCADE,
  part_id TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  identity_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(reservation_id, part_id, upload_id)
);

CREATE TABLE conductor_import_documents (
  reservation_id TEXT NOT NULL REFERENCES conductor_import_reservations(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  title TEXT,
  agent TEXT NOT NULL,
  message_count INTEGER NOT NULL,
  occurred_at INTEGER,
  object_id TEXT NOT NULL,
  memory_object_id TEXT NOT NULL,
  PRIMARY KEY(reservation_id, id)
);

CREATE TABLE conductor_import_proofs (
  reservation_id TEXT NOT NULL REFERENCES conductor_import_reservations(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY(reservation_id, id)
);

CREATE TABLE conductor_import_verified_prerequisites (
  reservation_id TEXT NOT NULL REFERENCES conductor_import_reservations(id) ON DELETE CASCADE,
  receipt_id TEXT NOT NULL,
  oid TEXT NOT NULL,
  head_oid TEXT NOT NULL,
  PRIMARY KEY(reservation_id, receipt_id, oid)
);

-- Cleanup and unresolved writes retain ownership after an org or reservation is gone.
CREATE TABLE conductor_import_cleanup (
  reservation_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'none',
  latest_target_at INTEGER NOT NULL,
  due_at INTEGER,
  first_deleted_at INTEGER,
  finished_at INTEGER,
  in_flight INTEGER NOT NULL DEFAULT 0,
  pending_write_json TEXT
);
CREATE INDEX conductor_import_cleanup_due ON conductor_import_cleanup(due_at);
