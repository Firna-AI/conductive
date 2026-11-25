import { requireActiveWorkspaceOwner } from '../data/user-access'
import type { GitHubWorkspace } from '../github/contracts'
import { activeWorkspace } from '../github/data'
import { requireWorkspaceOrg } from './access'
import type { BaseChangeJob } from './base-change-job'
import { readWorkspace } from './workspace-data'

function matchesTarget(current: GitHubWorkspace, job: BaseChangeJob): boolean {
  if (job.target === undefined)
    return current.baseBranch == null
      ? current.defaultBranch === job.change.to
      : current.baseBranch === job.change.from

  if ((current.baseBranch ?? null) !== job.target) return false
  // The saved default can still have the name from before the GitHub read.
  return (
    job.target !== null ||
    current.defaultBranch === job.change.to ||
    current.defaultBranch === job.binding.defaultBranch
  )
}

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
    !matchesTarget(current, job)
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
