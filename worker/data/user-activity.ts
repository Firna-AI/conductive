import { warnWorker } from '../warnings'

/**
 * The shortest time between two writes of the last active time of one
 * user. The operator sees the time to the minute at most.
 */
export const ACTIVITY_WRITE_INTERVAL_MS = 60_000

/**
 * Records a real action of the person: a new workspace, or a chat message
 * that they send from the app. The write runs only when the stored time is
 * older than the interval. A failed write logs a warning and never fails the
 * request of the person. With an execution context, the write runs after
 * the answer.
 */
export async function recordUserActivity(
  db: D1Database,
  userId: string,
  now: number,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<void> {
  const write = db
    .prepare(
      `UPDATE users SET last_active_at = ?2
       WHERE id = ?1 AND (last_active_at IS NULL OR last_active_at <= ?3)`,
    )
    .bind(userId, now, now - ACTIVITY_WRITE_INTERVAL_MS)
    .run()
    .then(
      () => undefined,
      () => warnWorker({ kind: 'user_activity_failed' }),
    )
  if (execution) execution.waitUntil(write)
  else await write
}
