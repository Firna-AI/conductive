import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord } from './contracts'
import { queueChanged } from './errors'
import { queueWorkspace } from './repository'
import type { QueueRuntime } from './step'

export function saveQueuedGitHubRef(
  db: D1Database,
  entry: QueueEntry,
  ref: { base: string; head: string; oldBase?: string; clearSync?: boolean },
) {
  return db
    .prepare(
      `UPDATE merge_queue_entries SET github_base = ?1, observed_head = ?2,
      pending_base = CASE WHEN pending_base = ?1 THEN NULL ELSE pending_base END,
      old_base_sha = COALESCE(?3, old_base_sha),
      old_base_head = CASE WHEN ?3 IS NULL THEN old_base_head ELSE ?2 END,
      sync_from = CASE WHEN ?4 THEN NULL ELSE sync_from END
     WHERE queue_id = ? AND workspace_id = ? AND queued_at = ? AND pull_number = ?`,
    )
    .bind(
      ref.base,
      ref.head,
      ref.oldBase ?? null,
      ref.clearSync ?? false,
      entry.queueId,
      entry.workspaceId,
      entry.queuedAt,
      entry.pullNumber,
    )
    .run()
}

export function expectQueueBase(db: D1Database, entry: QueueEntry, to: string) {
  return db
    .prepare(
      `UPDATE merge_queue_entries SET pending_base = ?, merge_head = NULL
     WHERE queue_id = ? AND workspace_id = ? AND queued_at = ? AND pull_number = ?`,
    )
    .bind(
      to,
      entry.queueId,
      entry.workspaceId,
      entry.queuedAt,
      entry.pullNumber,
    )
    .run()
}

export function forgetExpectedQueueBase(
  db: D1Database,
  entry: QueueEntry,
  to: string,
) {
  return db
    .prepare(
      `UPDATE merge_queue_entries SET pending_base = NULL
     WHERE queue_id = ? AND workspace_id = ? AND queued_at = ? AND pending_base = ?`,
    )
    .bind(entry.queueId, entry.workspaceId, entry.queuedAt, to)
    .run()
}

export function saveQueueStack(
  db: D1Database,
  queue: QueueRecord,
  number: number | null,
  writerId?: string,
) {
  return db
    .prepare(
      `UPDATE merge_queues SET github_stack_number = ?1, stack_writer_user_id = ?2,
       stack_cleanup_workspace_id = NULL, stack_cleanup_actor_user_id = NULL,
       rebuild_stack = 0, creating_stack = 0
      WHERE id = ?3 AND github_stack_number IS ?4 AND (?1 IS NULL OR NOT EXISTS (
        SELECT 1 FROM merge_queues other WHERE other.id != ?3
          AND other.github_repository_id = merge_queues.github_repository_id
          AND other.github_stack_number = ?1
      ))`,
    )
    .bind(number, writerId ?? null, queue.id, queue.githubStackNumber)
    .run()
}

export function reserveStackCreation(db: D1Database, queue: QueueRecord) {
  return db
    .prepare(
      'UPDATE merge_queues SET creating_stack = 1 WHERE id = ? AND github_stack_number IS NULL',
    )
    .bind(queue.id)
    .run()
}

export function finishQueueReorder(db: D1Database, queue: QueueRecord) {
  return db
    .prepare('UPDATE merge_queues SET reordering = 0 WHERE id = ?')
    .bind(queue.id)
    .run()
}

export async function followWorkspaceBase(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entry: QueueEntry,
  base: string,
) {
  const target = workspaceBinding(runtime.env).getByName(entry.workspaceId)
  try {
    if (
      !requireFeatureResult(
        await target.saveMergeQueueBase(
          queueWorkspace(queue, entry),
          base === queue.defaultBranch ? null : base,
        ),
      )
    )
      throw queueChanged()
  } catch (error) {
    if (!(error instanceof HttpError) || error.code !== 'workspace_not_found')
      throw error
  }
}
