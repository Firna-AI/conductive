import { requireActiveWorkspaceOwner } from '../data/user-access'
import { activeWorkspace } from '../github/data'
import { requireWorkspaceOrg } from './access'
import type { BaseChangeJob } from './base-change-job'
import { readWorkspace } from './workspace-data'

export async function baseChangeWorkspace(db: D1Database, job: BaseChangeJob) {
  const { binding } = job
  await requireWorkspaceOrg(db, binding.orgId, binding.id)
  const current = await activeWorkspace(db, binding.id, binding.orgId)
  if (
    !current ||
    current.branch !== binding.branch ||
    current.repositoryId !== binding.repositoryId ||
    current.installationId !== binding.installationId ||
    current.fullName !== binding.fullName ||
    (current.baseBranch != null && current.baseBranch !== job.change.from) ||
    (current.baseBranch == null && current.defaultBranch !== job.change.to)
  )
    return null
  const row = await readWorkspace(db, binding.orgId, binding.id)
  await requireActiveWorkspaceOwner(db, row.ownerUserId, binding.orgId)
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
