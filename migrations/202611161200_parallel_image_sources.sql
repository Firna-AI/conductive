-- Keep every legacy token and its original authenticated encryption context.
CREATE TABLE image_source_jobs_next (
  build_id TEXT NOT NULL,
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
  failed INTEGER NOT NULL DEFAULT 0,
  provider_account TEXT NOT NULL DEFAULT 'boat',
  estimate_bytes INTEGER NOT NULL DEFAULT 268435456,
  PRIMARY KEY (build_id, source_index)
);

INSERT INTO image_source_jobs_next (
  build_id, org_id, sandbox_id, source_index, repository_id, phase,
  process_id, stdout_offset, stderr_offset, grant_hash, token_ciphertext,
  failed, provider_account
)
SELECT build_id, org_id, sandbox_id, source_index, repository_id, phase,
  process_id, stdout_offset, stderr_offset, grant_hash, token_ciphertext,
  failed, provider_account
FROM image_source_jobs;

DROP TABLE image_source_jobs;
ALTER TABLE image_source_jobs_next RENAME TO image_source_jobs;
CREATE INDEX image_source_jobs_org ON image_source_jobs(org_id);

-- Neither table cascades. Cleanup retains ownership until confirmed revocation.
CREATE TABLE image_source_runs (
  build_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  sandbox_id TEXT NOT NULL,
  provider_account TEXT NOT NULL,
  phase TEXT NOT NULL,
  process_id INTEGER,
  stdout_offset INTEGER NOT NULL DEFAULT 0,
  stderr_offset INTEGER NOT NULL DEFAULT 0,
  memory_text TEXT NOT NULL DEFAULT '',
  memory_budget INTEGER,
  metadata_plan_json TEXT,
  metadata_batch_index INTEGER NOT NULL DEFAULT 0,
  metadata_repository_index INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX image_source_runs_org ON image_source_runs(org_id);

INSERT INTO image_source_runs (build_id, org_id, sandbox_id, provider_account, phase)
SELECT build_id, org_id, sandbox_id, provider_account, 'legacy'
FROM image_source_jobs;

CREATE TRIGGER computer_ledger_source_insert AFTER INSERT ON image_source_jobs
WHEN EXISTS (SELECT 1 FROM orgs WHERE id = NEW.org_id) BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id,
    (SELECT started_by_user_id FROM image_builds WHERE id = NEW.build_id AND org_id = NEW.org_id),
    'build', NEW.build_id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;

CREATE TRIGGER computer_ledger_source_update AFTER UPDATE OF sandbox_id, provider_account ON image_source_jobs
WHEN EXISTS (SELECT 1 FROM orgs WHERE id = NEW.org_id) BEGIN
  INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, owner_user_id, purpose, purpose_id)
  SELECT NEW.sandbox_id, NEW.provider_account, NEW.org_id,
    (SELECT started_by_user_id FROM image_builds WHERE id = NEW.build_id AND org_id = NEW.org_id),
    'build', NEW.build_id
  WHERE NOT EXISTS (SELECT 1 FROM computer_ledger WHERE sandbox_id = NEW.sandbox_id AND provider_account = NEW.provider_account);
END;
