import type { BuildPhase } from './build-data'
import { buildLogStatements } from './build-log-statements'
import { clearImageRetryStatement } from './image-retry-data'

/** An optional log line commits with the phase change, so a retry never repeats it. */
export async function completeBuildPhase(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
  log?: { text: string; now: number },
): Promise<void> {
  await db.batch([
    db
      .prepare(
        'UPDATE image_build_jobs SET phase = ?, process_id = NULL, stdout_offset = 0, stderr_offset = 0 WHERE build_id = ?',
      )
      .bind(phase, buildId),
    clearImageRetryStatement(db, buildId),
    ...(log ? buildLogStatements(db, buildId, log.text, log.now) : []),
  ])
}
