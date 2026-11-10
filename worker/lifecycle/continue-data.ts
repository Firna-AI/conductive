import { activeOrgPredicate } from '../data/org-access'
import { HttpError } from '../http'
import { readMergeWorkspace } from '../github/merge-access'
import { requireActiveWorkspaceOwner } from '../data/user-access'
import { readWorkspace } from './workspace-data'
import type { ContinueJob, ContinueOptions } from './continue-types'

export async function authorizeContinue(
  options: ContinueOptions,
  job: ContinueJob,
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
      'workspace_branch_changed',
      'The workspace branch changed. Open the workspace and try again.',
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

export async function storeContinuedBranch(
  options: ContinueOptions,
  job: ContinueJob,
) {
  const { DB: db } = options.env
  await db.batch([
    db
      .prepare(
        `UPDATE workspaces SET branch = ?, updated_at = MAX(updated_at, ?)
      WHERE id = ? AND org_id = ? AND repository_id = ? AND sandbox_id = ? AND provider_account = ? AND branch = ?
      AND archived_at IS NULL AND state != 'archived'
      AND EXISTS (SELECT 1 FROM orgs o WHERE o.id = workspaces.org_id AND ${activeOrgPredicate('o')})`,
      )
      .bind(
        job.branch,
        options.dependencies.now(),
        job.binding.id,
        job.binding.orgId,
        job.repositoryId,
        job.sandboxId,
        job.providerAccount,
        job.binding.branch,
      ),
    db
      .prepare(
        `UPDATE repositories SET default_branch = ? WHERE id = ? AND org_id = ?
      AND EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND branch = ? AND sandbox_id = ? AND provider_account = ?)`,
      )
      .bind(
        job.baseBranch,
        job.repositoryId,
        job.binding.orgId,
        job.binding.id,
        job.branch,
        job.sandboxId,
        job.providerAccount,
      ),
  ])
  const row = await readWorkspace(db, job.binding.orgId, job.binding.id)
  if (
    row.branch !== job.branch ||
    row.sandboxId !== job.sandboxId ||
    row.providerAccount !== job.providerAccount
  )
    throw new Error('The continued branch publication is pending.')
  return row
}
