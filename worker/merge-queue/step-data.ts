import type { QueueLeave, QueueRecord, QueueScope } from './contracts'

export async function queueScopesForRepository(
  db: D1Database,
  repositoryId: number,
  installationId: number,
) {
  const { results } = await db
    .prepare(
      `SELECT q.org_id AS orgId, q.github_repository_id AS githubRepositoryId
     FROM merge_queues q JOIN repositories r ON r.id = q.repository_id AND r.org_id = q.org_id
     WHERE q.github_repository_id = ? AND r.installation_id = ?
       AND (q.github_stack_number IS NOT NULL OR q.creating_stack = 1 OR EXISTS (
         SELECT 1 FROM merge_queue_entries e WHERE e.queue_id = q.id
       ))`,
    )
    .bind(repositoryId, installationId)
    .all<QueueScope>()
  return results
}

export async function staleQueueEntries(db: D1Database, queue: QueueRecord) {
  const { results } = await db
    .prepare(
      `WITH checked AS (
       SELECT e.workspace_id AS workspaceId, e.branch, e.pull_number AS pullNumber,
         CASE
           WHEN w.archived_at IS NOT NULL OR w.state = 'archived' THEN 'archived'
           WHEN w.repository_id != ? THEN 'repository-changed'
           WHEN w.branch != e.branch THEN 'branch-changed'
           WHEN m.user_id IS NULL OR u.id IS NULL THEN 'queuer-left'
         END AS cause
       FROM merge_queue_entries e
       JOIN workspaces w ON w.id = e.workspace_id AND w.org_id = ?
       LEFT JOIN org_members m ON m.org_id = w.org_id AND m.user_id = e.queuer_user_id
       LEFT JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
       WHERE e.queue_id = ?
     )
     SELECT workspaceId, branch, pullNumber, cause FROM checked WHERE cause IS NOT NULL`,
    )
    .bind(queue.repositoryId, queue.orgId, queue.id)
    .all<Extract<QueueLeave, { workspaceId: string }>>()
  return results
}

export async function renameQueueTrunk(
  db: D1Database,
  queue: QueueRecord,
  now: number,
) {
  await db.batch([
    db
      .prepare(
        `UPDATE merge_queues SET trunk = ?, updated_at = ?
     WHERE id = ? AND trunk = ? AND EXISTS (
       SELECT 1 FROM repositories r WHERE r.id = repository_id
       AND r.org_id = merge_queues.org_id AND r.default_branch = ?
     )`,
      )
      .bind(
        queue.defaultBranch,
        now,
        queue.id,
        queue.trunk,
        queue.defaultBranch,
      ),
    db
      .prepare(
        `UPDATE merge_queue_entries SET github_base = ? WHERE queue_id = ?
       AND github_base = ? AND EXISTS (
         SELECT 1 FROM merge_queues q WHERE q.id = queue_id AND q.trunk = ?
       )`,
      )
      .bind(queue.defaultBranch, queue.id, queue.trunk, queue.defaultBranch),
  ])
}

export function rememberTrunkPull(
  db: D1Database,
  queue: QueueRecord,
  number: number,
) {
  return db
    .prepare(
      'UPDATE merge_queues SET trunk_pull_number = ? WHERE id = ? AND trunk = ? AND trunk_pull_number IS NOT ?',
    )
    .bind(number, queue.id, queue.trunk, number)
    .run()
}
