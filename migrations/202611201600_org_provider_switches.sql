CREATE TABLE org_provider_switches (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  end_running_job INTEGER NOT NULL DEFAULT 0 CHECK (end_running_job IN (0, 1)),
  end_running_job_id TEXT REFERENCES image_builds(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'waiting'
    CHECK (state IN ('waiting', 'building', 'failed', 'stopped', 'completed')),
  wait_reason TEXT CHECK (wait_reason IN ('job', 'suspended', 'deleted', 'admin')),
  wait_job_id TEXT REFERENCES image_builds(id) ON DELETE SET NULL,
  build_id TEXT REFERENCES image_builds(id) ON DELETE SET NULL,
  build_started_at INTEGER,
  build_completed_at INTEGER,
  failure_cause TEXT CHECK (failure_cause IN ('provider', 'script', 'time-limit')),
  account_changed_at INTEGER,
  stopped_at INTEGER,
  stopped_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX org_provider_switches_open ON org_provider_switches(org_id)
  WHERE state IN ('waiting', 'building');
CREATE INDEX org_provider_switches_org ON org_provider_switches(org_id, requested_at);

ALTER TABLE image_builds ADD COLUMN operator_switch_id TEXT
  REFERENCES org_provider_switches(id) ON DELETE SET NULL;
ALTER TABLE image_builds ADD COLUMN waiting_for_switch_id TEXT
  REFERENCES org_provider_switches(id) ON DELETE SET NULL;
ALTER TABLE image_builds ADD COLUMN execution_started_at INTEGER;
CREATE INDEX image_builds_operator_switch ON image_builds(operator_switch_id)
  WHERE operator_switch_id IS NOT NULL;
