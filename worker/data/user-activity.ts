import type { RequestContext } from '../security/gate'
import { warnWorker } from '../warnings'

/**
 * The shortest time between two writes of the last active time of one
 * user. The operator sees the time to the minute at most.
 */
export const ACTIVITY_WRITE_INTERVAL_MS = 60_000

/**
 * The person of a signed-in request, as the session gate gives it. Only a
 * route that passed the gate holds a sign-in session ID, so shared code of
 * agent tools and automations cannot record an action of its own.
 */
type SignedInPerson = Pick<RequestContext, 'user' | 'sessionId'>

/**
 * Records a real action of the person: a new workspace, or a chat message
 * that they send from the app. The write runs only while the sign-in
 * session of the request exists, and only when the stored time is older
 * than the interval. A failed write logs a warning and never fails the
 * request of the person. With an execution context, the write runs after
 * the answer.
 */
export async function recordUserActivity(
  db: D1Database,
  person: SignedInPerson,
  now: number,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<void> {
  const write = db
    .prepare(
      `UPDATE users SET last_active_at = ?3
       WHERE id = ?1
         AND (last_active_at IS NULL OR last_active_at <= ?4)
         AND EXISTS (SELECT 1 FROM sessions WHERE id = ?2 AND user_id = ?1)`,
    )
    .bind(
      person.user.id,
      person.sessionId,
      now,
      now - ACTIVITY_WRITE_INTERVAL_MS,
    )
    .run()
    .then(
      () => undefined,
      () => warnWorker({ kind: 'user_activity_failed' }),
    )
  if (execution) execution.waitUntil(write)
  else await write
}
