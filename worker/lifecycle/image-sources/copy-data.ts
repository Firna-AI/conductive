import { buildLogStatements } from '../build-log-statements'
import type { SourceJob } from './source-data'

export async function finishSourceCopy(
  db: D1Database,
  job: SourceJob,
  succeeded: boolean,
  now: number,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE image_source_jobs SET phase = 'revoke', process_id = NULL,
       grant_hash = NULL, failed = ? WHERE build_id = ? AND source_index = ?`,
      )
      .bind(succeeded ? 0 : 1, job.buildId, job.sourceIndex),
    ...buildLogStatements(db, job.buildId, 'Repository copy complete.\n', now),
  ])
}

export async function refuseSourceCopy(db: D1Database, job: SourceJob) {
  await db
    .prepare(
      `UPDATE image_source_jobs SET phase = 'retry-revoke', process_id = NULL,
     grant_hash = NULL WHERE build_id = ? AND source_index = ?`,
    )
    .bind(job.buildId, job.sourceIndex)
    .run()
}
