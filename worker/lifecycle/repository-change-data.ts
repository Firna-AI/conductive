import { activeOrgPredicate } from '../data/org-access'
import { requireActiveWorkspaceOwner } from '../data/user-access'
import { readMergeWorkspace } from '../github/merge-access'
import { HttpError } from '../http'
import { readChosenRepository } from './repository-change-target'
import type {
  RepositoryChangeJob,
  RepositoryChangeOptions,
} from './repository-change-types'
import { readWorkspace } from './workspace-data'

/**
 * The check of each phase: the member still has access, the record still
 * names the old repository, branch, sandbox, and provider account, and the
 * org still chose the new repository.
 */
export async function authorizeRepositoryChange(
  options: RepositoryChangeOptions,
  job: RepositoryChangeJob,
) {
  await options.assertActive()
  const current = await readMergeWorkspace(
    options.env.DB,
    job.binding.orgId,
    job.binding.id,
    job.member.id,
  )
  if (
    current.repositoryId !== job.binding.repositoryId ||
    current.installationId !== job.binding.installationId ||
    current.branch !== job.binding.branch
  )
    throw new HttpError(
      409,
      'workspace_repository_changed',
      'The repository or the branch of the workspace changed. Open the workspace and try again.',
    )
  const target = await readChosenRepository(
    options.env.DB,
    job.binding.orgId,
    job.target.repositoryId,
  )
  if (
    target.githubRepositoryId !== job.target.binding.repositoryId ||
    target.installationId !== job.target.binding.installationId
  )
    throw new HttpError(
      409,
      'workspace_repository_changed',
      'The new repository changed. Open the workspace and try again.',
    )
  const row = await readWorkspace(
    options.env.DB,
    job.binding.orgId,
    job.binding.id,
  )
  await requireActiveWorkspaceOwner(options.env.DB, row.ownerUserId, row.orgId)
  if (
    row.sandboxId !== job.sandboxId ||
    row.providerAccount !== job.providerAccount
  )
    throw new HttpError(
      409,
      'sandbox_unavailable',
      'The cloud computer changed. Open the workspace and try again.',
    )
  return row
}

/**
 * One guarded write of the new repository, branch, and base branch. The
 * match on the old repository and branch makes a repeated write change
 * nothing, so the task number grows once for each change. The installation
 * follows the repository, because D1 keeps it on the repository row.
 */
export async function storeChangedRepository(
  options: RepositoryChangeOptions,
  job: RepositoryChangeJob,
) {
  const { DB: db } = options.env
  const { binding, target } = job
  await db.batch([
    db
      .prepare(
        `UPDATE workspaces SET repository_id = ?, branch = ?, base_branch = ?, github_summary = NULL,
        task_number = task_number + 1, updated_at = MAX(updated_at, ?)
      WHERE id = ? AND org_id = ? AND repository_id = ? AND sandbox_id = ? AND provider_account = ? AND branch = ?
      AND archived_at IS NULL AND state != 'archived'
      AND EXISTS (SELECT 1 FROM orgs o WHERE o.id = workspaces.org_id AND ${activeOrgPredicate('o')})
      AND EXISTS (SELECT 1 FROM repositories r WHERE r.id = ? AND r.org_id = workspaces.org_id AND r.selected = 1)`,
      )
      .bind(
        target.repositoryId,
        job.branch,
        job.baseBranch,
        options.dependencies.now(),
        binding.id,
        binding.orgId,
        job.repositoryId,
        job.sandboxId,
        job.providerAccount,
        binding.branch,
        target.repositoryId,
      ),
    db
      .prepare(
        `UPDATE repositories SET default_branch = ? WHERE id = ? AND org_id = ?
      AND EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND repository_id = ? AND branch = ? AND sandbox_id = ? AND provider_account = ?)`,
      )
      .bind(
        job.baseBranch,
        target.repositoryId,
        binding.orgId,
        binding.id,
        target.repositoryId,
        job.branch,
        job.sandboxId,
        job.providerAccount,
      ),
  ])
  const row = await readWorkspace(db, binding.orgId, binding.id)
  if (
    row.repositoryId !== target.repositoryId ||
    row.branch !== job.branch ||
    row.baseBranch !== job.baseBranch ||
    row.sandboxId !== job.sandboxId ||
    row.providerAccount !== job.providerAccount
  )
    throw new Error('The repository change publication is pending.')
  return row
}
