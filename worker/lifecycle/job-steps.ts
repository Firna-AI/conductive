/**
 * The D1 statements of the job step records: the begin and the end of each
 * step of a build, refresh, create, or resume, and one row for each run of
 * a start. Operators and agents read them with SQL, as
 * `docs/protocol/step-timing.md` says. Every statement is conflict-safe and
 * checks the org itself, so a record never fails the batch of the phase
 * change that it measures.
 */

type JobKind = 'build' | 'refresh' | 'create' | 'resume'
export type JobOutcome = 'done' | 'failed'

/** The cron deletes records after this many days. */
const JOB_RECORD_DAYS = 90

let workerVersion: string | null = null

/** Each isolate runs one Worker version. The workspace object sets it at its start. */
export function rememberWorkerVersion(env: {
  CF_VERSION_METADATA?: { id: string }
}): void {
  workerVersion ??= env.CF_VERSION_METADATA?.id ?? null
}

export function currentWorkerVersion(): string | null {
  return workerVersion
}

/** Closes each open step of the job, except the steps that stay open. */
export function closeJobStepsStatement(
  db: D1Database,
  jobId: string,
  endedAt: number,
  outcome: JobOutcome,
  keep: readonly string[] = [],
): D1PreparedStatement {
  const kept = keep.length
    ? ` AND step NOT IN (${keep.map(() => '?').join(', ')})`
    : ''
  return db
    .prepare(
      `UPDATE job_steps SET ended_at = MAX(started_at, ?), outcome = ?
       WHERE job_id = ? AND ended_at IS NULL${kept}`,
    )
    .bind(endedAt, outcome, jobId, ...keep)
}

/** Opens a step of a build or refresh. The build row gives its kind and org. */
export function openBuildStepStatement(
  db: D1Database,
  buildId: string,
  step: string,
  startedAt: number,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO job_steps (job_id, step, job_kind, org_id, started_at, worker_version)
       SELECT b.id, ?, b.kind, b.org_id, ?, ? FROM image_builds b
       WHERE b.id = ? AND EXISTS (SELECT 1 FROM orgs WHERE orgs.id = b.org_id)
       ON CONFLICT (job_id, step) DO NOTHING`,
    )
    .bind(step, startedAt, currentWorkerVersion(), buildId)
}

/** Closes the other open steps of a build and opens the given steps. */
export function buildStepStatements(
  db: D1Database,
  buildId: string,
  steps: readonly string[],
  now: number,
): D1PreparedStatement[] {
  return [
    closeJobStepsStatement(db, buildId, now, 'done', steps),
    ...steps.map((step) => openBuildStepStatement(db, buildId, step, now)),
  ]
}

export interface StartStepRecord {
  jobId: string
  jobKind: Extract<JobKind, 'create' | 'resume'>
  orgId: string
  workspaceId: string
  step: string
  startedAt: number
  endedAt: number | null
  outcome: JobOutcome | null
  workerVersion: string | null
}

/**
 * Writes a step of a start. A repeat keeps the first begin and the latest
 * end, so a send that runs twice changes nothing.
 */
export function startStepStatement(
  db: D1Database,
  record: StartStepRecord,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO job_steps (job_id, step, job_kind, org_id, workspace_id,
         started_at, ended_at, outcome, worker_version)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM orgs WHERE id = ?)
       ON CONFLICT (job_id, step) DO UPDATE SET
         started_at = MIN(job_steps.started_at, excluded.started_at),
         ended_at = COALESCE(excluded.ended_at, job_steps.ended_at),
         outcome = COALESCE(excluded.outcome, job_steps.outcome)`,
    )
    .bind(
      record.jobId,
      record.step,
      record.jobKind,
      record.orgId,
      record.workspaceId,
      record.startedAt,
      record.endedAt,
      record.outcome,
      record.workerVersion,
      record.orgId,
    )
}

export interface JobRunRecord {
  jobId: string
  runNumber: number
  jobKind: Extract<JobKind, 'create' | 'resume'>
  orgId: string
  workspaceId: string
  phase: string
  dueAt: number | null
  beganAt: number
  endedAt: number
  queueWaitMs: number
  queueRewaitMs: number
  providerCalls: number
  providerMs: number
  pollCalls: number
  pollMs: number
  d1Calls: number
  d1Ms: number
  slowestCall: string | null
  slowestMs: number | null
  workerVersion: string | null
}

/** Writes one run of a start. A repeat of the same run changes nothing. */
export function jobRunStatement(
  db: D1Database,
  run: JobRunRecord,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO job_runs (job_id, run_number, job_kind, org_id, workspace_id,
         phase, due_at, began_at, ended_at, queue_wait_ms, queue_rewait_ms,
         provider_calls, provider_ms, poll_calls, poll_ms, d1_calls, d1_ms,
         slowest_call, slowest_ms, worker_version)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM orgs WHERE id = ?)
       ON CONFLICT (job_id, run_number) DO NOTHING`,
    )
    .bind(
      run.jobId,
      run.runNumber,
      run.jobKind,
      run.orgId,
      run.workspaceId,
      run.phase,
      run.dueAt,
      run.beganAt,
      run.endedAt,
      run.queueWaitMs,
      run.queueRewaitMs,
      run.providerCalls,
      run.providerMs,
      run.pollCalls,
      run.pollMs,
      run.d1Calls,
      run.d1Ms,
      run.slowestCall,
      run.slowestMs,
      run.workerVersion,
      run.orgId,
    )
}

/** Deletes up to `limit` records of each table that are older than 90 days. */
export async function deleteOldJobRecords(
  db: D1Database,
  now: number,
  limit = 5_000,
): Promise<void> {
  const before = now - JOB_RECORD_DAYS * 86_400_000
  await db.batch([
    db
      .prepare(
        'DELETE FROM job_steps WHERE rowid IN (SELECT rowid FROM job_steps WHERE started_at < ? LIMIT ?)',
      )
      .bind(before, limit),
    db
      .prepare(
        'DELETE FROM job_runs WHERE rowid IN (SELECT rowid FROM job_runs WHERE began_at < ? LIMIT ?)',
      )
      .bind(before, limit),
  ])
}
