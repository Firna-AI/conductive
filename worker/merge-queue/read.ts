import type { MergeQueueBarState } from '../../src/shared/generated/MergeQueueBarState'
import type { MergeQueueEntry } from '../../src/shared/generated/MergeQueueEntry'
import type { WorkspaceListRepository } from '../../src/shared/generated/WorkspaceListRepository'
import { isGitCommitOid } from '../../src/shared/git-commit-oid'
import { REPOSITORY_ORDER } from '../data/repository-order'
import type { GitHubSnapshot, GitHubWorkspace } from '../github/contracts'
import type { QueueEntry } from './contracts'
import { queueReservesRepository } from './data'
import { removalPlan } from './order'

export const queueEntryBindingSql = `JOIN merge_queues q ON q.id = e.queue_id
  JOIN workspaces w ON w.id = e.workspace_id AND w.org_id = q.org_id
    AND w.repository_id = q.repository_id AND w.branch = e.branch
  JOIN orgs o ON o.id = q.org_id AND o.deleted_at IS NULL AND o.suspended_at IS NULL`

const liveWorkspace = `w.archived_at IS NULL AND w.state != 'archived'`

export async function listedQueueEntries(db: D1Database, orgId: string) {
  const { results } = await db
    .prepare(
      `SELECT e.workspace_id AS workspaceId, e.queue_id AS queueId, e.unit_id AS unitId,
         ROW_NUMBER() OVER (PARTITION BY e.queue_id ORDER BY e.place) AS place,
         e.state, e.pull_number AS pullNumber
     FROM merge_queue_entries e ${queueEntryBindingSql}
     WHERE q.org_id = ? AND ${liveWorkspace}`,
    )
    .bind(orgId)
    .all<MergeQueueEntry & { workspaceId: string }>()
  return new Map(
    results.map(({ workspaceId, ...entry }) => [workspaceId, entry]),
  )
}

export async function listedRemovalPlans(db: D1Database, orgId: string) {
  type Row = Pick<
    QueueEntry,
    | 'queueId'
    | 'workspaceId'
    | 'branch'
    | 'place'
    | 'unitId'
    | 'memberBase'
    | 'githubBase'
    | 'pullNumber'
  > & { trunk: string }
  const { results } = await db
    .prepare(
      `SELECT e.queue_id AS queueId, e.workspace_id AS workspaceId, e.branch, e.place,
       e.unit_id AS unitId, e.member_base AS memberBase, e.github_base AS githubBase,
       e.pull_number AS pullNumber, q.trunk
     FROM merge_queue_entries e JOIN merge_queues q ON e.queue_id = q.id
     WHERE q.org_id = ? ORDER BY e.queue_id, e.place`,
    )
    .bind(orgId)
    .all<Row>()
  const queues = new Map<string, Row[]>()
  for (const row of results) {
    const entries = queues.get(row.queueId)
    if (entries) entries.push(row)
    else queues.set(row.queueId, [row])
  }
  return new Map(
    results.map((row) => {
      const plan = removalPlan(queues.get(row.queueId) ?? [], row, row.trunk)
      return [
        row.workspaceId,
        {
          base: plan.base,
          above: plan.above.map(({ workspaceId, pullNumber }) => ({
            workspaceId,
            pullNumber,
          })),
        },
      ] as const
    }),
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
         COALESCE(LAG(e.branch) OVER (ORDER BY e.place), q.trunk) AS rebaseBase,
         LAG(e.observed_head) OVER (ORDER BY e.place) AS rebaseHead,
         q.trunk,
         CASE WHEN q.trunk != r.default_branch AND e.state != 'merging' THEN 'waiting' ELSE e.state END AS state,
         CASE WHEN q.trunk != r.default_branch AND e.state != 'merging' THEN 'trunk-change' ELSE e.wait_reason END AS wait,
         e.pull_number AS pullNumber, e.place AS savedPlace,
         CASE WHEN q.trunk = r.default_branch
           AND q.rebuild_stack = 0 THEN e.merge_head END AS mergeHead,
         e.blocking_pull_number AS blockedByPullNumber, e.old_base_sha AS oldBase,
         e.old_base_head AS oldBaseHead
       FROM merge_queue_entries e ${queueEntryBindingSql}
       JOIN repositories r ON r.id = q.repository_id AND r.org_id = q.org_id
       WHERE q.org_id = ? AND q.github_repository_id = ? AND ${liveWorkspace}
     )
     SELECT place, count, belowPullNumber, trunk, state, wait, pullNumber, savedPlace,
       mergeHead, blockedByPullNumber, oldBase, oldBaseHead, rebaseBase, rebaseHead
     FROM bar WHERE workspace_id = ?`,
    )
    .bind(workspace.orgId, workspace.repositoryId, workspace.id)
    .first<
      MergeQueueBarState & {
        pullNumber: number
        savedPlace: number
        mergeHead: string | null
        blockedByPullNumber: number | null
        oldBase: string | null
        oldBaseHead: string | null
        rebaseBase: string
        rebaseHead: string | null
      }
    >()
  if (!row) return null
  const {
    mergeHead,
    pullNumber,
    savedPlace,
    blockedByPullNumber,
    oldBase,
    oldBaseHead,
    rebaseBase,
    rebaseHead,
    ...entry
  } = row
  const pull = snapshot?.banner.pullRequest
  const baseHead =
    rebaseHead ??
    (pull?.number === pullNumber && snapshot?.pullBaseBranch === rebaseBase
      ? snapshot.pullBaseSha
      : undefined)
  const knownOldBase =
    isGitCommitOid(oldBase) &&
    pull?.number === pullNumber &&
    pull.headSha === oldBaseHead
      ? { oldBase }
      : {}
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
    ...knownOldBase,
    rebase: {
      base: rebaseBase,
      ...(isGitCommitOid(baseHead) && { baseHead }),
      ...knownOldBase,
    },
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

export async function listedGitHubRepositories(db: D1Database, orgId: string) {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.github_repository_id AS repositoryId, r.full_name AS fullName,
       r.default_branch AS defaultBranch, r.selected,
       (SELECT id FROM github_installations i WHERE i.id = r.installation_id AND i.suspended_at IS NULL) AS installationId,
       EXISTS (SELECT 1 FROM merge_queues q WHERE q.github_repository_id = r.github_repository_id
         AND q.org_id != r.org_id AND ${queueReservesRepository}) AS queueInUse
     FROM repositories r
     WHERE r.org_id = ? AND (r.selected = 1 OR EXISTS (
       SELECT 1 FROM workspaces w WHERE w.org_id = r.org_id AND w.repository_id = r.id))
     ORDER BY ${REPOSITORY_ORDER}`,
    )
    .bind(orgId)
    .all<
      Pick<GitHubWorkspace, 'repositoryId' | 'installationId'> &
        Omit<WorkspaceListRepository, 'selected' | 'queueInUse'> & {
          selected: number
          queueInUse: number
        }
    >()
  return results
}
