import { queueId } from './contracts'
import { readQueueEntry } from './data'
import type { QueueFixRequest, QueueFixWait } from './fix-contracts'
import { sameFixEntry } from './fix-contracts'

export async function currentFixEntry(db: D1Database, fix: QueueFixRequest) {
  const entry = await readQueueEntry(
    db,
    queueId(fix.scope),
    fix.entry.workspaceId,
  )
  return sameFixEntry(entry, fix.entry) ? entry : null
}

type FixBarState =
  | { state: 'queued' | 'restacking'; wait: null }
  | { state: 'waiting'; wait: QueueFixWait | 'token' }

export async function saveFixBarState(
  db: D1Database,
  fix: QueueFixRequest,
  { state, wait }: FixBarState,
  now: number,
): Promise<void> {
  const { workspaceId, branch, pullNumber, queuedAt, queuerUserId, unitId } =
    fix.entry
  await db
    .prepare(
      `UPDATE merge_queue_entries SET state = ?, wait_reason = ?, step_at = ?
       WHERE queue_id = ? AND workspace_id = ? AND branch = ?
         AND pull_number = ? AND queued_at = ? AND queuer_user_id = ? AND unit_id = ?
         AND (state != ? OR wait_reason IS NOT ?)`,
    )
    .bind(
      state,
      wait,
      now,
      queueId(fix.scope),
      workspaceId,
      branch,
      pullNumber,
      queuedAt,
      queuerUserId,
      unitId,
      state,
      wait,
    )
    .run()
}
