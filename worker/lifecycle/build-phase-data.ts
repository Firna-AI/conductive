import type { BuildPhase } from './build-data'
import { clearImageRetryStatement } from './image-retry-data'

export async function completeBuildPhase(
  db: D1Database,
  buildId: string,
  phase: BuildPhase,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        'UPDATE image_build_jobs SET phase = ?, process_id = NULL, stdout_offset = 0, stderr_offset = 0 WHERE build_id = ?',
      )
      .bind(phase, buildId),
    clearImageRetryStatement(db, buildId),
  ])
}
