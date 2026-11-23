import { scheduleWorkspaceAlarm } from '../features/alarms'
import { requireGitBranchName } from '../github/branch-name'
import type { GitHubWorkspace } from '../github/contracts'
import type { ReceiverStorage } from '../members/receiver-storage'
import { boundBaseWorkspace } from './base-change-access'
import { BASE_CHANGE_JOB_KEY, type BaseChangeJob } from './base-change-job'

export async function saveQueueBaseChange(
  db: D1Database,
  storage: ReceiverStorage,
  binding: GitHubWorkspace,
  to: string | null,
  now: number,
): Promise<boolean> {
  const current = await boundBaseWorkspace(db, binding)
  if (!current) return true
  const from = current.binding.baseBranch ?? null
  const target = to ?? binding.defaultBranch
  requireGitBranchName(target)
  if (to === null && binding.defaultBranch !== current.binding.defaultBranch)
    return false
  const next: BaseChangeJob = {
    id: `baseChange-${crypto.randomUUID()}`,
    binding: current.binding,
    change: { from: from ?? current.binding.defaultBranch, to: target },
    queueBase: { repositoryId: current.row.repositoryId, from, to },
    at: now,
    failures: 0,
  }
  if (current.row.archivedAt !== null || current.row.state === 'archived')
    return from === to || moveQueueBase(db, next, true)
  const job = await storage.transaction(async (transaction) => {
    const pending = await transaction.get<BaseChangeJob>(BASE_CHANGE_JOB_KEY)
    const sameBinding =
      pending?.binding.branch === binding.branch &&
      pending.binding.repositoryId === binding.repositoryId &&
      pending.binding.installationId === binding.installationId
    if (
      sameBinding &&
      pending.queueBase?.to === to &&
      (from === pending.queueBase.from || from === to) &&
      pending.change.to === target
    )
      return pending
    if (from === to && (!sameBinding || pending.change.to === target))
      return null
    await transaction.put(BASE_CHANGE_JOB_KEY, next)
    await transaction.put('alarm:baseChange', now)
    await scheduleWorkspaceAlarm(transaction)
    return next
  })
  return !job || moveQueueBase(db, job)
}

export async function moveQueueBase(
  db: D1Database,
  job: BaseChangeJob,
  includeArchived = false,
) {
  const base = job.queueBase
  if (!base) return false
  const { binding } = job
  const changed = await db
    .prepare(
      `UPDATE workspaces SET base_branch = ?
     WHERE id = ? AND org_id = ? AND repository_id = ? AND branch = ?
      AND (? OR (archived_at IS NULL AND state != 'archived'))
      AND (base_branch IS ? OR base_branch IS ?)
      AND EXISTS (SELECT 1 FROM repositories r
        WHERE r.org_id = workspaces.org_id AND r.id = workspaces.repository_id
        AND r.github_repository_id = ? AND r.full_name = ? AND r.installation_id = ?
        AND (? IS NOT NULL OR r.default_branch = ?))`,
    )
    .bind(
      base.to,
      binding.id,
      binding.orgId,
      base.repositoryId,
      binding.branch,
      includeArchived,
      base.from,
      base.to,
      binding.repositoryId,
      binding.fullName,
      binding.installationId,
      base.to,
      job.change.to,
    )
    .run()
  return changed.meta.changes === 1
}
