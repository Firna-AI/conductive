import type { BuildPhase } from './build-data'
import { buildStepStatements, closeJobStepsStatement } from './job-steps'

/**
 * The job step records of a build or refresh, as the "Step records" section
 * of `image-builds.md` says. Each phase that a build enters opens its steps
 * and closes the others. Cleanup gets no step.
 */
export function buildPhaseStepStatements(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
  now: number,
): D1PreparedStatement[] {
  switch (phase) {
    case 'allocating':
      return buildStepStatements(
        db,
        buildId,
        ['phase:allocating', 'computer:request'],
        now,
      )
    case 'sources':
      return buildStepStatements(
        db,
        buildId,
        ['phase:sources', 'computer:boot'],
        now,
      )
    case 'software':
    case 'install':
    case 'snapshot':
    case 'publish':
      return buildStepStatements(db, buildId, [`phase:${phase}`], now)
    default:
      return []
  }
}

/** The first copy command runs only on a ready computer, so it ends the boot. */
export function buildBootedStatement(
  db: D1Database,
  buildId: string,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE job_steps SET ended_at = MAX(started_at, ?), outcome = 'done'
       WHERE job_id = ? AND step = 'computer:boot' AND ended_at IS NULL`,
    )
    .bind(now, buildId)
}

/** A failed build closes its open step as failed. */
export function failedBuildStepsStatement(
  db: D1Database,
  buildId: string,
  now: number,
): D1PreparedStatement {
  return closeJobStepsStatement(db, buildId, now, 'failed')
}

/** Runs after the publish write, so it closes the steps only of a success. */
export function publishedBuildStepsStatement(
  db: D1Database,
  buildId: string,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE job_steps SET ended_at = MAX(started_at, ?), outcome = 'done'
       WHERE job_id = ? AND ended_at IS NULL AND EXISTS
         (SELECT 1 FROM image_builds WHERE id = ? AND state = 'succeeded')`,
    )
    .bind(now, buildId, buildId)
}
