import { buildPhaseStatement, type BuildPhase } from './build-data'
import { buildLogStatements } from './build-log-statements'
import { buildPhaseStepStatements } from './build-step-data'
import { clearImageRetryStatement } from './image-retry-data'

/**
 * The step records and an optional log line commit with the phase change,
 * so a retry never repeats them.
 */
export async function completeBuildPhase(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
  now: number,
  log?: string,
): Promise<void> {
  await db.batch([
    buildPhaseStatement(db, buildId, phase),
    clearImageRetryStatement(db, buildId),
    ...(log ? buildLogStatements(db, buildId, log, now) : []),
    ...buildPhaseStepStatements(db, buildId, phase, now),
  ])
}

/** A new job enters the allocating phase before its provider request. */
export async function beginBuildAllocation(
  db: D1Database,
  buildId: string,
  now: number,
): Promise<void> {
  await db.batch([
    buildPhaseStatement(db, buildId, 'allocating'),
    ...buildPhaseStepStatements(db, buildId, 'allocating', now),
  ])
}
