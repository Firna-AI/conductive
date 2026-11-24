import type { QueueEntry, QueueRecord } from './contracts'
import type { MergeProjection } from './merge-choice'
import type { QueueMergeJob } from './merge-job'
import { ageQueueListFacts } from './list-facts-data'

export async function projectMerge(
  db: D1Database,
  queue: QueueRecord,
  rows: readonly MergeProjection[],
  now: number,
) {
  await db
    .prepare(
      `WITH ready AS (
      SELECT json_extract(value, '$.workspaceId') AS workspace_id,
        json_extract(value, '$.head') AS head, json_extract(value, '$.wait') AS wait,
        json_extract(value, '$.blockedBy') AS blocked_by FROM json_each(?)
    )
    UPDATE merge_queue_entries SET merge_head = ready.head,
      blocking_pull_number = ready.blocked_by,
      state = CASE WHEN state = 'restacking' THEN state WHEN ready.wait IS NULL THEN 'queued' ELSE 'waiting' END,
      wait_reason = ready.wait,
      step_at = CASE WHEN wait_reason IS NOT ready.wait OR state = 'merging' THEN ? ELSE step_at END
    FROM ready WHERE queue_id = ? AND merge_queue_entries.workspace_id = ready.workspace_id`,
    )
    .bind(JSON.stringify(rows), now, queue.id)
    .run()
}

export async function markQueueMerging(
  db: D1Database,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
  now: number,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE merge_queue_entries SET merge_head = NULL
       WHERE queue_id = ? AND workspace_id NOT IN (SELECT value FROM json_each(?))`,
      )
      .bind(
        queue.id,
        JSON.stringify(entries.map(({ workspaceId }) => workspaceId)),
      ),
    db
      .prepare(
        `UPDATE merge_queue_entries SET state = 'merging', wait_reason = NULL,
      blocking_pull_number = NULL, step_at = ?
      WHERE queue_id = ? AND workspace_id IN (SELECT value FROM json_each(?))`,
      )
      .bind(
        now,
        queue.id,
        JSON.stringify(entries.map(({ workspaceId }) => workspaceId)),
      ),
    ageQueueListFacts(db, queue.id),
  ])
}

export async function clearMergeHeads(db: D1Database, queue: QueueRecord) {
  await db
    .prepare(
      'UPDATE merge_queue_entries SET merge_head = NULL WHERE queue_id = ?',
    )
    .bind(queue.id)
    .run()
}

export async function finishQueueMerge(
  db: D1Database,
  queue: QueueRecord,
  now: number,
) {
  await db
    .prepare(
      `UPDATE merge_queue_entries SET state = 'queued', merge_head = NULL, step_at = ?
     WHERE queue_id = ? AND state = 'merging'`,
    )
    .bind(now, queue.id)
    .run()
}

export async function markMergeRefused(
  db: D1Database,
  job: Extract<QueueMergeJob, { stage: 'settling' }>,
  now: number,
) {
  const { queue, input } = job
  const target = job.layers.at(-1)?.entry
  if (job.stackPullNumbers || !target) return
  await db
    .prepare(
      `UPDATE merge_queue_entries SET state = 'waiting', wait_reason = 'merge-refused',
      step_at = ?, refused_head = ?
      WHERE queue_id = ? AND workspace_id = ? AND branch = ? AND queued_at = ? AND unit_id = ?`,
    )
    .bind(
      now,
      input.headSha,
      queue.id,
      target.workspaceId,
      target.branch,
      target.queuedAt,
      target.unitId,
    )
    .run()
}

export async function liveMergePrefix(
  db: D1Database,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
) {
  const match = await db
    .prepare(
      `SELECT count(*) AS count FROM merge_queue_entries e
    JOIN merge_queues q ON q.id = e.queue_id AND q.trunk = ? AND q.github_stack_number IS ?
      AND q.rebuild_stack = 0
    JOIN workspaces w ON w.id = e.workspace_id AND w.org_id = ?
      AND w.repository_id = ? AND w.branch = e.branch AND w.archived_at IS NULL AND w.state != 'archived'
    JOIN orgs o ON o.id = w.org_id AND o.suspended_at IS NULL AND o.deleted_at IS NULL
    JOIN org_members m ON m.org_id = o.id AND m.user_id = e.queuer_user_id
    JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
    JOIN repositories r ON r.org_id = o.id AND r.id = w.repository_id
      AND r.default_branch = q.trunk AND r.github_repository_id = ? AND r.installation_id = ?
    JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
    JOIN json_each(?) prefix ON json_extract(prefix.value, '$.workspaceId') = e.workspace_id
      AND json_extract(prefix.value, '$.place') = e.place
      AND json_extract(prefix.value, '$.pullNumber') = e.pull_number
      AND json_extract(prefix.value, '$.queuedAt') = e.queued_at
      AND json_extract(prefix.value, '$.unitId') = e.unit_id
    WHERE e.queue_id = ? AND (e.sync_from IS NULL OR e.sync_from = e.observed_head)`,
    )
    .bind(
      queue.trunk,
      queue.githubStackNumber,
      queue.orgId,
      queue.repositoryId,
      queue.githubRepositoryId,
      queue.installationId,
      JSON.stringify(entries),
      queue.id,
    )
    .first<number>('count')
  return match === entries.length
}
