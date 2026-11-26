-- Step times of builds, refreshes, creates, and resumes, for operators and agents.
-- Rows hold fixed step names, IDs, and times only. The 15-minute cron deletes
-- rows after 90 days. No foreign key: a write checks the org itself, so a
-- record never fails the batch of the phase change that it measures.
CREATE TABLE job_steps (
  job_id TEXT NOT NULL,
  step TEXT NOT NULL,
  job_kind TEXT NOT NULL CHECK (job_kind IN ('build', 'refresh', 'create', 'resume')),
  org_id TEXT NOT NULL,
  workspace_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  outcome TEXT CHECK (outcome IN ('done', 'failed')),
  worker_version TEXT,
  PRIMARY KEY (job_id, step)
);
CREATE INDEX job_steps_started ON job_steps(started_at);
CREATE INDEX job_steps_kind_step ON job_steps(job_kind, step, started_at);
CREATE INDEX job_steps_org ON job_steps(org_id);

CREATE TABLE job_runs (
  job_id TEXT NOT NULL,
  run_number INTEGER NOT NULL,
  job_kind TEXT NOT NULL CHECK (job_kind IN ('create', 'resume')),
  org_id TEXT NOT NULL,
  workspace_id TEXT,
  phase TEXT NOT NULL,
  due_at INTEGER,
  began_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  queue_wait_ms INTEGER NOT NULL DEFAULT 0,
  queue_rewait_ms INTEGER NOT NULL DEFAULT 0,
  provider_calls INTEGER NOT NULL DEFAULT 0,
  provider_ms INTEGER NOT NULL DEFAULT 0,
  poll_calls INTEGER NOT NULL DEFAULT 0,
  poll_ms INTEGER NOT NULL DEFAULT 0,
  d1_calls INTEGER NOT NULL DEFAULT 0,
  d1_ms INTEGER NOT NULL DEFAULT 0,
  slowest_call TEXT,
  slowest_ms INTEGER,
  worker_version TEXT,
  PRIMARY KEY (job_id, run_number)
);
CREATE INDEX job_runs_began ON job_runs(began_at);
CREATE INDEX job_runs_kind_phase ON job_runs(job_kind, phase, began_at);
CREATE INDEX job_runs_org ON job_runs(org_id);
