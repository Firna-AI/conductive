import { requireActiveWorkspaceOwner } from '../data/user-access'
import { activeWorkspace } from '../github/data'
import { requireWorkspaceOrg } from './access'
import type { BaseChangeJob } from './base-change-job'
import { readWorkspace } from './workspace-data'

export async function baseChangeWorkspace(db: D1Database, job: BaseChangeJob) {
  const current = await boundBaseWorkspace(db, job.binding)
  if (!current) return null
  if (job.queueBase) {
    const base = current.binding.baseBranch ?? null
    if (
      current.row.repositoryId !== job.queueBase.repositoryId ||
      (base !== job.queueBase.from && base !== job.queueBase.to) ||
      (job.queueBase.to === null &&
        current.binding.defaultBranch !== job.change.to)
    )
      return null
  } else if (
    current.binding.baseBranch != null
      ? current.binding.baseBranch !== job.change.from
      : current.binding.defaultBranch !== job.change.to
  ) {
    return null
  }
  await requireActiveWorkspaceOwner(
    db,
    current.row.ownerUserId,
    job.binding.orgId,
  )
  return current
}

export async function boundBaseWorkspace(
  db: D1Database,
  binding: BaseChangeJob['binding'],
) {
  await requireWorkspaceOrg(db, binding.orgId, binding.id)
  const current = await activeWorkspace(db, binding.id, binding.orgId)
  if (
    !current ||
    current.branch !== binding.branch ||
    current.repositoryId !== binding.repositoryId ||
    current.installationId !== binding.installationId ||
    current.fullName !== binding.fullName
  )
    return null
  const row = await readWorkspace(db, binding.orgId, binding.id)
  return { binding: current, row }
}

export function baseChangeComputerReady(
  row: Awaited<ReturnType<typeof readWorkspace>>,
): boolean {
  return (
    row.sandboxId !== null &&
    row.archivedAt === null &&
    ['ready', 'unread', 'working', 'input', 'starting'].includes(row.state)
  )
}
