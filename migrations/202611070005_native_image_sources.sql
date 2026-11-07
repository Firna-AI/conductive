-- Revocation ownership must survive removal of the org or its build records.
-- The lifecycle cleanup hook removes this row only after GitHub confirms revocation.
CREATE TABLE image_source_jobs (
  build_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  sandbox_id TEXT NOT NULL,
  source_index INTEGER NOT NULL DEFAULT 0,
  repository_id TEXT,
  phase TEXT NOT NULL,
  process_id INTEGER,
  stdout_offset INTEGER NOT NULL DEFAULT 0,
  stderr_offset INTEGER NOT NULL DEFAULT 0,
  grant_hash TEXT UNIQUE,
  token_ciphertext TEXT,
  failed INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX image_source_jobs_org ON image_source_jobs(org_id);
