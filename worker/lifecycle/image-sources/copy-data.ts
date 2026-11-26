import { buildLogStatements } from '../build-log-statements'
import type { SourceJob } from './source-data'

/** Names the repository when the captured list still has it. */
function sourceCopyLogLine(
  fullName: string | undefined,
  succeeded: boolean,
): string {
  const message = succeeded
    ? 'Repository copy complete'
    : 'Repository copy failed'
  return fullName ? `${message}: ${fullName}\n` : `${message}.\n`
}

export async function finishSourceCopy(
  db: D1Database,
  job: SourceJob,
  fullName: string | undefined,
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
    ...buildLogStatements(
      db,
      job.buildId,
      sourceCopyLogLine(fullName, succeeded),
      now,
    ),
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
