import type { GitHubWorkspace } from '../github/contracts'
import type { GitHubStackQueue } from '../../src/shared/generated/GitHubStackQueue'
import type { QueueEntry, QueueRecord, QueueScope } from './contracts'
import { queueId } from './contracts'

const queueEntryColumns = `queue_id AS queueId, workspace_id AS workspaceId, branch,
  pull_number AS pullNumber, queuer_user_id AS queuerUserId,
  place, unit_id AS unitId, state, wait_reason AS wait,
  queued_at AS queuedAt, step_at AS stepAt, member_base AS memberBase,
  merge_head AS mergeHead, refused_head AS refusedHead,
  old_base_sha AS oldBase, old_base_head AS oldBaseHead, github_base AS githubBase,
  pending_base AS pendingBase, observed_head AS observedHead, sync_from AS syncFrom`

export const queueReservesRepository = `(q.creating_stack = 1 OR EXISTS (
  SELECT 1 FROM merge_queue_entries e WHERE e.queue_id = q.id
))`

export function readQueue(
  db: D1Database,
  scope: QueueScope,
): Promise<QueueRecord | null> {
  return db
    .prepare(
      `SELECT q.id, q.org_id AS orgId, q.repository_id AS repositoryId,
       q.github_repository_id AS githubRepositoryId, q.trunk,
       q.trunk_pull_number AS trunkPullNumber,
       r.full_name AS fullName, r.installation_id AS installationId,
       q.github_stack_number AS githubStackNumber, q.pending_write AS pendingWrite,
       q.stack_writer_user_id AS stackWriterUserId,
       q.stack_cleanup_workspace_id AS stackCleanupWorkspaceId,
       q.stack_cleanup_actor_user_id AS stackCleanupActorUserId,
       q.rebuild_stack AS rebuildStack,
       q.reordering,
       r.default_branch AS defaultBranch, o.suspended_at AS suspendedAt
     FROM merge_queues q
     JOIN repositories r ON r.id = q.repository_id AND r.org_id = q.org_id
     JOIN orgs o ON o.id = q.org_id
     WHERE q.id = ? AND q.org_id = ? AND q.github_repository_id = ?`,
    )
    .bind(queueId(scope), scope.orgId, scope.githubRepositoryId)
    .first<QueueRecord>()
}

export async function readQueueEntries(
  db: D1Database,
  id: string,
): Promise<QueueEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT ${queueEntryColumns}
     FROM merge_queue_entries WHERE queue_id = ? ORDER BY place, workspace_id`,
    )
    .bind(id)
    .all<QueueEntry>()
  return results
}

export function readQueueEntry(
  db: D1Database,
  id: string,
  workspaceId: string,
): Promise<QueueEntry | null> {
  return db
    .prepare(
      `SELECT ${queueEntryColumns} FROM merge_queue_entries
       WHERE queue_id = ? AND workspace_id = ?`,
    )
    .bind(id, workspaceId)
    .first<QueueEntry>()
}

export async function otherOrgQueuesRepository(
  db: D1Database,
  scope: QueueScope,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        `SELECT 1 FROM merge_queues q WHERE q.github_repository_id = ? AND q.org_id != ?
       AND ${queueReservesRepository} LIMIT 1`,
      )
      .bind(scope.githubRepositoryId, scope.orgId)
      .first()) !== null
  )
}

/** Another org takes priority if the landed set overlaps more than one queue. */
export async function queueOfPulls(
  db: D1Database,
  scope: QueueScope,
  pullNumbers: readonly number[],
): Promise<GitHubStackQueue | null> {
  const match = await db
    .prepare(
      `SELECT MAX(CASE WHEN q.org_id = ? THEN 1 ELSE 2 END) AS owner
     FROM merge_queues q JOIN merge_queue_entries e ON e.queue_id = q.id
     WHERE q.github_repository_id = ?
       AND e.pull_number IN (SELECT value FROM json_each(?))`,
    )
    .bind(scope.orgId, scope.githubRepositoryId, JSON.stringify(pullNumbers))
    .first<number>('owner')
  return match === 2 ? 'other-org' : match === 1 ? 'same-org' : null
}

export async function stackOfAnotherQueue(
  db: D1Database,
  queue: QueueRecord,
  number: number,
) {
  return (
    (await db
      .prepare(
        'SELECT 1 FROM merge_queues WHERE github_repository_id = ? AND github_stack_number = ? AND id != ?',
      )
      .bind(queue.githubRepositoryId, number, queue.id)
      .first()) !== null
  )
}

export function workspaceForQueueBranch(
  db: D1Database,
  scope: QueueScope,
  branch: string,
  pullNumber: number,
): Promise<{ id: string } | null> {
  return db
    .prepare(
      `SELECT w.id FROM workspaces w
     JOIN repositories r ON r.org_id = w.org_id AND r.id = w.repository_id
     LEFT JOIN merge_queue_entries e ON e.workspace_id = w.id
       AND e.branch = w.branch AND e.pull_number = ?
     WHERE w.org_id = ? AND r.github_repository_id = ? AND w.branch = ?
       AND w.archived_at IS NULL AND w.state != 'archived'
     ORDER BY e.workspace_id IS NULL, w.created_at, w.id LIMIT 1`,
    )
    .bind(pullNumber, scope.orgId, scope.githubRepositoryId, branch)
    .first<{ id: string }>()
}

export function scopeForQueueWorkspace(
  db: D1Database,
  workspace: Pick<GitHubWorkspace, 'id' | 'orgId'> & { branch?: string },
): Promise<QueueScope | null> {
  return db
    .prepare(
      `SELECT q.org_id AS orgId, q.github_repository_id AS githubRepositoryId
     FROM merge_queue_entries e JOIN merge_queues q ON q.id = e.queue_id
     WHERE q.org_id = ? AND e.workspace_id = ? AND (? IS NULL OR e.branch = ?)`,
    )
    .bind(
      workspace.orgId,
      workspace.id,
      workspace.branch ?? null,
      workspace.branch ?? null,
    )
    .first<QueueScope>()
}

export async function queueScopesForOrg(
  db: D1Database,
  orgId: string,
): Promise<QueueScope[]> {
  const { results } = await db
    .prepare(
      `SELECT q.org_id AS orgId, q.github_repository_id AS githubRepositoryId
     FROM merge_queues q WHERE q.org_id = ?
       AND EXISTS (SELECT 1 FROM merge_queue_entries e WHERE e.queue_id = q.id)`,
    )
    .bind(orgId)
    .all<QueueScope>()
  return results
}

export async function scopesWithQueuer(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<QueueScope[]> {
  const { results } = await db
    .prepare(
      `SELECT q.org_id AS orgId, q.github_repository_id AS githubRepositoryId
     FROM merge_queues q WHERE q.org_id = ?
       AND EXISTS (
         SELECT 1 FROM merge_queue_entries e WHERE e.queue_id = q.id AND e.queuer_user_id = ?
       )`,
    )
    .bind(orgId, userId)
    .all<QueueScope>()
  return results
}
