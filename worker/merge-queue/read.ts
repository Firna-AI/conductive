import type { MergeQueueBarState } from '../../src/shared/generated/MergeQueueBarState'
import type { MergeQueueEntry } from '../../src/shared/generated/MergeQueueEntry'
import type { GitHubWorkspace } from '../github/contracts'

const activeEntry = `JOIN merge_queues q ON q.id = e.queue_id
  JOIN workspaces w ON w.id = e.workspace_id AND w.org_id = q.org_id
    AND w.repository_id = q.repository_id AND w.branch = e.branch
    AND w.archived_at IS NULL AND w.state != 'archived'
  JOIN orgs o ON o.id = q.org_id AND o.deleted_at IS NULL AND o.suspended_at IS NULL`

export async function listedQueueEntries(db: D1Database, orgId: string) {
  const { results } = await db
    .prepare(
      `SELECT e.workspace_id AS workspaceId, e.queue_id AS queueId, e.unit_id AS unitId,
         ROW_NUMBER() OVER (PARTITION BY e.queue_id ORDER BY e.place) AS place, e.state
     FROM merge_queue_entries e ${activeEntry}
     WHERE q.org_id = ?`,
    )
    .bind(orgId)
    .all<MergeQueueEntry & { workspaceId: string }>()
  return new Map(
    results.map(({ workspaceId, ...entry }) => [workspaceId, entry]),
  )
}

export function queueBarState(
  db: D1Database,
  workspace: GitHubWorkspace,
): Promise<MergeQueueBarState | null> {
  return db
    .prepare(
      `WITH bar AS (
       SELECT e.workspace_id, ROW_NUMBER() OVER (ORDER BY e.place) AS place,
         COUNT(*) OVER () AS count, LAG(e.pull_number) OVER (ORDER BY e.place) AS belowPullNumber,
         q.trunk, e.state, e.wait_reason AS wait
       FROM merge_queue_entries e ${activeEntry}
       WHERE q.org_id = ? AND q.github_repository_id = ?
     )
     SELECT place, count, belowPullNumber, trunk, state, wait
     FROM bar WHERE workspace_id = ?`,
    )
    .bind(workspace.orgId, workspace.repositoryId, workspace.id)
    .first<MergeQueueBarState>()
}

export async function listedGitHubRepositories(
  db: D1Database,
  orgId: string,
  ids: string[],
) {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.github_repository_id AS repositoryId, r.full_name AS fullName
     FROM repositories r JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
     WHERE r.org_id = ? AND r.id IN (SELECT value FROM json_each(?))`,
    )
    .bind(orgId, JSON.stringify(ids))
    .all<Pick<GitHubWorkspace, 'id' | 'repositoryId' | 'fullName'>>()
  return results
}
