import type { QueueEntry, QueueRecord } from './contracts'

export interface QueueLeaveNotice {
  workspaceId: string
  branch: string
  pullNumber: number
  baseBranch: string
}

export async function leaveOwner(
  db: D1Database,
  queue: QueueRecord,
  workspaceId: string,
) {
  return db
    .prepare(
      'SELECT owner_user_id AS id FROM workspaces WHERE id = ? AND org_id = ?',
    )
    .bind(workspaceId, queue.orgId)
    .first<{ id: string }>()
}

/** The old binding is valid for resetting its pull request after a workspace move. */
export async function canResetBase(
  db: D1Database,
  queue: QueueRecord,
  entry: QueueEntry,
  userId: string,
) {
  return (
    (await db
      .prepare(
        `SELECT 1 FROM merge_queue_entries e
     JOIN merge_queues q ON q.id = e.queue_id
     JOIN orgs o ON o.id = q.org_id AND o.deleted_at IS NULL
     JOIN org_members m ON m.org_id = q.org_id AND m.user_id = ?
     JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
     JOIN repositories r ON r.id = q.repository_id AND r.org_id = q.org_id
       AND r.github_repository_id = q.github_repository_id
     JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
     WHERE q.id = ? AND r.installation_id = ? AND e.workspace_id = ?
       AND e.branch = ? AND e.pull_number = ? AND e.queued_at = ?`,
      )
      .bind(
        userId,
        queue.id,
        queue.installationId,
        entry.workspaceId,
        entry.branch,
        entry.pullNumber,
        entry.queuedAt,
      )
      .first()) !== null
  )
}

/** The notice and the removal commit in one D1 batch. */
export function leaveNoticeWrites(
  db: D1Database,
  queueId: string,
  writeId: string,
  removed: readonly QueueEntry[],
  notices: readonly QueueLeaveNotice[],
) {
  return [
    db
      .prepare(
        `DELETE FROM merge_queue_leave_notices
      WHERE workspace_id IN (SELECT value FROM json_each(?))
        AND EXISTS (SELECT 1 FROM merge_queues WHERE id = ? AND pending_write = ?)`,
      )
      .bind(
        JSON.stringify(removed.map((entry) => entry.workspaceId)),
        queueId,
        writeId,
      ),
    db
      .prepare(
        `INSERT INTO merge_queue_leave_notices (workspace_id, org_id,
        github_repository_id, branch, pull_number, base_branch)
      SELECT json_extract(n.value, '$.workspaceId'), q.org_id, q.github_repository_id,
        json_extract(n.value, '$.branch'), json_extract(n.value, '$.pullNumber'),
        json_extract(n.value, '$.baseBranch')
      FROM merge_queues q, json_each(?) n WHERE q.id = ? AND q.pending_write = ?`,
      )
      .bind(JSON.stringify(notices), queueId, writeId),
  ]
}
