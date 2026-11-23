import type { GitHubWorkspace } from '../github/contracts'
import {
  queueId,
  type QueueCandidate,
  type QueueEntry,
  type QueueScope,
  type QueueWriter,
} from './contracts'
import { leaveNoticeWrites, type QueueLeaveNotice } from './leave-data'
import { queueReservesRepository } from './data'
import { ageQueueListFacts } from './list-facts-data'

const noOtherQueue = `NOT EXISTS (
  SELECT 1 FROM merge_queues q
  WHERE q.github_repository_id = r.github_repository_id AND q.org_id != r.org_id
    AND ${queueReservesRepository}
)`

const liveWorkspace = `w.repository_id = r.id AND w.org_id = r.org_id
  AND w.branch = json_extract(c.value, '$.branch')
  AND w.archived_at IS NULL AND w.state != 'archived'`

export async function addQueueEntries(
  db: D1Database,
  input: {
    scope: QueueScope
    workspace: GitHubWorkspace
    memberId: string
    trunk: string
    unitId: string
    place: number
    candidates: QueueCandidate[]
    now: number
    writeId: string
  },
): Promise<boolean> {
  const {
    scope,
    workspace,
    memberId,
    trunk,
    unitId,
    place,
    candidates,
    now,
    writeId,
  } = input
  const id = queueId(scope)
  const json = JSON.stringify(candidates)
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO merge_queues (
         id, org_id, repository_id, github_repository_id, trunk, pending_write, created_at, updated_at,
         trunk_pull_number
       )
       SELECT ?1, r.org_id, r.id, r.github_repository_id, ?6, ?7, ?8, ?8,
         (SELECT json_extract(c.value, '$.pullNumber') FROM json_each(?9) c
          WHERE json_extract(c.value, '$.githubBase') = ?6 ORDER BY c.key DESC LIMIT 1)
       FROM repositories r
       JOIN orgs o ON o.id = r.org_id AND o.deleted_at IS NULL AND o.suspended_at IS NULL
       JOIN org_members m ON m.org_id = r.org_id AND m.user_id = ?4
       JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
       JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
       WHERE r.org_id = ?2 AND r.github_repository_id = ?3 AND r.installation_id = ?5
         AND ${noOtherQueue}
         AND NOT EXISTS (
           SELECT 1 FROM json_each(?9) c
           WHERE NOT EXISTS (
             SELECT 1 FROM workspaces w
             LEFT JOIN merge_queue_entries e ON e.workspace_id = w.id
             WHERE w.id = json_extract(c.value, '$.workspaceId')
               AND ${liveWorkspace} AND e.workspace_id IS NULL
           )
         )
       ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at,
         pending_write = excluded.pending_write, trunk = excluded.trunk,
         trunk_pull_number = CASE WHEN merge_queues.trunk = excluded.trunk
           THEN COALESCE(excluded.trunk_pull_number, merge_queues.trunk_pull_number)
           ELSE excluded.trunk_pull_number END
       WHERE merge_queues.trunk = excluded.trunk OR NOT EXISTS (
         SELECT 1 FROM merge_queue_entries WHERE queue_id = excluded.id
       )`,
      )
      .bind(
        id,
        scope.orgId,
        scope.githubRepositoryId,
        memberId,
        workspace.installationId,
        trunk,
        writeId,
        now,
        json,
      ),
    db
      .prepare(
        `UPDATE merge_queue_entries SET place = place + ?, merge_head = NULL
       WHERE queue_id = ? AND place >= ?
         AND EXISTS (SELECT 1 FROM merge_queues WHERE id = ? AND pending_write = ?)`,
      )
      .bind(candidates.length, id, place, id, writeId),
    db
      .prepare(
        `INSERT INTO merge_queue_entries (
         workspace_id, queue_id, branch, pull_number, queuer_user_id,
         place, unit_id, state, queued_at, step_at, member_base, old_base_sha, old_base_head,
         github_base, observed_head
       )
       SELECT json_extract(c.value, '$.workspaceId'), q.id, json_extract(c.value, '$.branch'),
         json_extract(c.value, '$.pullNumber'), ?, ? + c.key, ?, 'queued', ?, ?,
         json_extract(c.value, '$.memberBase'), json_extract(c.value, '$.oldBase'),
         json_extract(c.value, '$.oldBaseHead'), json_extract(c.value, '$.githubBase'),
         json_extract(c.value, '$.oldBaseHead')
       FROM merge_queues q, json_each(?) c WHERE q.id = ? AND q.pending_write = ?`,
      )
      .bind(memberId, place, unitId, now, now, json, id, writeId),
    ageQueueListFacts(db, id, writeId),
  ])
  return results[2].meta.changes === candidates.length
}

export async function saveQueueOrder(
  db: D1Database,
  input: {
    id: string
    remaining: readonly QueueEntry[]
    removed: readonly QueueEntry[]
    now: number
    writeId: string
    writer?: QueueWriter
    notices?: readonly QueueLeaveNotice[]
    leaveActorId?: string
    merged?: QueueEntry
    syncUnitId?: string
    reordering?: true
  },
): Promise<boolean> {
  const {
    id,
    remaining,
    removed,
    now,
    writeId,
    writer,
    notices,
    leaveActorId,
    merged,
    syncUnitId,
    reordering,
  } = input
  const results = await db.batch([
    db
      .prepare(
        `UPDATE merge_queues SET updated_at = ?1, pending_write = ?2,
         rebuild_stack = CASE WHEN (?3 OR ?4 IS NOT NULL) AND github_stack_number IS NOT NULL THEN 1 ELSE rebuild_stack END,
         reordering = CASE WHEN ?3 THEN 1 ELSE reordering END,
         stack_cleanup_workspace_id = CASE WHEN github_stack_number IS NOT NULL
           THEN COALESCE(stack_cleanup_workspace_id, ?4) END,
         stack_cleanup_actor_user_id = CASE WHEN github_stack_number IS NULL THEN NULL
           WHEN stack_cleanup_workspace_id IS NULL THEN ?5 ELSE stack_cleanup_actor_user_id END
         WHERE id = ?6
         AND (?7 IS NULL OR EXISTS (
           SELECT 1 FROM workspaces w
           JOIN orgs o ON o.id = w.org_id AND o.deleted_at IS NULL AND o.suspended_at IS NULL
           JOIN org_members m ON m.org_id = w.org_id AND m.user_id = ?7
           JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
           JOIN repositories r ON r.id = w.repository_id AND r.org_id = w.org_id
           JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
           WHERE w.id = ?8 AND w.org_id = merge_queues.org_id
             AND w.repository_id = merge_queues.repository_id AND w.branch = ?9
             AND r.installation_id = ?10 AND w.archived_at IS NULL AND w.state != 'archived'
         ))`,
      )
      .bind(
        now,
        writeId,
        reordering === true,
        removed[0]?.workspaceId ?? null,
        leaveActorId ?? null,
        id,
        writer?.memberId ?? null,
        writer?.workspace.id ?? null,
        writer?.workspace.branch ?? null,
        writer?.workspace.installationId ?? null,
      ),
    ...(removed.length
      ? leaveNoticeWrites(db, id, writeId, removed, notices ?? [])
      : []),
    ...(merged
      ? [
          db
            .prepare(
              `UPDATE merge_queue_entries SET sync_from = COALESCE(sync_from, observed_head)
             WHERE queue_id = ? AND place > ?
             AND (? IS NULL OR unit_id = ?)
             AND EXISTS (SELECT 1 FROM merge_queues WHERE id = ? AND pending_write = ?)`,
            )
            .bind(
              id,
              merged.place,
              syncUnitId ?? null,
              syncUnitId ?? null,
              id,
              writeId,
            ),
        ]
      : []),
    db
      .prepare(
        `UPDATE merge_queue_entries AS e SET member_base = (
       SELECT lower.branch FROM merge_queue_entries lower
       WHERE lower.queue_id = e.queue_id AND lower.unit_id = e.unit_id AND lower.place < e.place
       ORDER BY lower.place DESC LIMIT 1)
       WHERE e.queue_id = ? AND e.member_base IS NULL
       AND EXISTS (SELECT 1 FROM merge_queues WHERE id = ? AND pending_write = ?)`,
      )
      .bind(id, id, writeId),
    db
      .prepare(
        `DELETE FROM merge_queue_entries
       WHERE queue_id = ? AND workspace_id IN (SELECT value FROM json_each(?))
         AND EXISTS (SELECT 1 FROM merge_queues WHERE id = ? AND pending_write = ?)`,
      )
      .bind(
        id,
        JSON.stringify(removed.map(({ workspaceId }) => workspaceId)),
        id,
        writeId,
      ),
    db
      .prepare(
        `WITH changes AS (
         SELECT value AS workspace_id, key + 1 AS place FROM json_each(?)
       )
       UPDATE merge_queue_entries SET place = changes.place, merge_head = NULL
       FROM changes
       WHERE queue_id = ? AND merge_queue_entries.workspace_id = changes.workspace_id
         AND EXISTS (SELECT 1 FROM merge_queues WHERE id = ? AND pending_write = ?)`,
      )
      .bind(
        JSON.stringify(remaining.map(({ workspaceId }) => workspaceId)),
        id,
        id,
        writeId,
      ),
    ageQueueListFacts(db, id, writeId),
  ])
  return results[0].meta.changes === 1
}

export async function completeQueueStep(
  db: D1Database,
  id: string,
  now: number,
) {
  await db
    .prepare(
      'UPDATE merge_queues SET stepped_at = ?, pending_write = NULL WHERE id = ?',
    )
    .bind(now, id)
    .run()
}
