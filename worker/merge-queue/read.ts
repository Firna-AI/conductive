import type { MergeQueueBarState } from '../../src/shared/generated/MergeQueueBarState'
import type { MergeQueueEntry } from '../../src/shared/generated/MergeQueueEntry'
import type { GitHubSnapshot, GitHubWorkspace } from '../github/contracts'

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

export async function queueBarState(
  db: D1Database,
  workspace: GitHubWorkspace,
  snapshot?: GitHubSnapshot | null,
) {
  const row = await db
    .prepare(
      `WITH bar AS (
       SELECT e.workspace_id, ROW_NUMBER() OVER (ORDER BY e.place) AS place,
         COUNT(*) OVER () AS count, LAG(e.pull_number) OVER (ORDER BY e.place) AS belowPullNumber,
         q.trunk, e.state, e.wait_reason AS wait, e.pull_number AS pullNumber, e.place AS savedPlace,
         CASE WHEN q.trunk = r.default_branch THEN e.merge_head END AS mergeHead,
         e.blocking_pull_number AS blockedByPullNumber
       FROM merge_queue_entries e ${activeEntry}
       JOIN repositories r ON r.id = q.repository_id AND r.org_id = q.org_id
       WHERE q.org_id = ? AND q.github_repository_id = ?
     )
     SELECT place, count, belowPullNumber, trunk, state, wait, pullNumber, savedPlace,
       mergeHead, blockedByPullNumber
     FROM bar WHERE workspace_id = ?`,
    )
    .bind(workspace.orgId, workspace.repositoryId, workspace.id)
    .first<
      MergeQueueBarState & {
        pullNumber: number
        savedPlace: number
        mergeHead: string | null
        blockedByPullNumber: number | null
      }
    >()
  if (!row) return null
  const { mergeHead, pullNumber, savedPlace, blockedByPullNumber, ...entry } =
    row
  const pull = snapshot?.banner.pullRequest
  const mergeAhead =
    mergeHead &&
    entry.place === savedPlace &&
    snapshot?.banner.state === 'ready-to-merge' &&
    pull?.headSha === mergeHead &&
    pull.number === pullNumber
      ? entry.place - 1
      : undefined
  return {
    ...entry,
    ...(mergeAhead !== undefined && { mergeAhead }),
    ...(blockedByPullNumber !== null && { blockedByPullNumber }),
  }
}

export async function queueLeaveBase(
  db: D1Database,
  workspace: GitHubWorkspace,
  snapshot: GitHubSnapshot | undefined,
) {
  const pull = snapshot?.banner.pullRequest
  if (
    !pull ||
    !snapshot?.pullBaseBranch ||
    snapshot.banner.state === 'merged' ||
    snapshot.banner.state === 'closed'
  )
    return null
  return db
    .prepare(
      `SELECT base_branch FROM merge_queue_leave_notices
    WHERE workspace_id = ? AND org_id = ? AND github_repository_id = ?
      AND branch = ? AND pull_number = ? AND base_branch = ?`,
    )
    .bind(
      workspace.id,
      workspace.orgId,
      workspace.repositoryId,
      workspace.branch,
      pull.number,
      snapshot.pullBaseBranch,
    )
    .first<string>('base_branch')
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
