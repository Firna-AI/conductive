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
 * The guard of the publish write, on the `workspaces` table: the row still
 * names the old repository, branch, sandbox, and provider account, in an
 * active org, a workspace that is not archived, and a new repository of the
 * same org. The guard does not ask for a chosen new repository: each phase
 * before the move checked the choice, and once the move ran, the record
 * must follow Git, also when an admin unchose the repository meanwhile.
 */
const OLD_WORKSPACE = `workspaces.id = ? AND workspaces.org_id = ? AND workspaces.repository_id = ?
      AND workspaces.sandbox_id = ? AND workspaces.provider_account = ? AND workspaces.branch = ?
      AND workspaces.archived_at IS NULL AND workspaces.state != 'archived'
      AND EXISTS (SELECT 1 FROM orgs o WHERE o.id = workspaces.org_id AND ${activeOrgPredicate('o')})
      AND EXISTS (SELECT 1 FROM repositories r WHERE r.id = ? AND r.org_id = workspaces.org_id)`

function oldWorkspaceBindings(job: RepositoryChangeJob) {
  const { binding, target } = job
  return [
    binding.id,
    binding.orgId,
    job.repositoryId,
    job.sandboxId,
    job.providerAccount,
    binding.branch,
    target.repositoryId,
  ]
}

/**
 * Drops the file and diff tabs and the temporary-tab mark from the saved
 * view of each member, because their paths belong to the old folder. The
 * session tabs stay. An active file or diff tab leaves no active tab, so
 * the chat shows the first open session. A view that is not valid JSON
 * stays as it is.
 */
const DROP_FILE_TABS = `UPDATE workspace_views SET view_json = json_set(view_json,
      '$.tabs', json((SELECT json_group_array(json(tab.value))
        FROM json_each(workspace_views.view_json, '$.tabs') tab
        WHERE json_extract(tab.value, '$.kind') = 'session')),
      '$.activeTab', json(CASE WHEN json_extract(view_json, '$.activeTab.kind') = 'session'
        THEN json_extract(view_json, '$.activeTab') ELSE 'null' END),
      '$.temporaryTab', json('null')),
    updated_at = MAX(updated_at, ?)
    WHERE workspace_id = ? AND json_valid(view_json) AND json_type(view_json, '$.tabs') = 'array'
    AND EXISTS (SELECT 1 FROM workspaces WHERE ${OLD_WORKSPACE})`

/**
 * One guarded batch: it closes the file and diff tabs of every saved view,
 * then writes the new repository, branch, and base branch. Both statements
 * match on the old repository and branch, so a repeated write changes
 * nothing: the task number grows once for each change, and a tab of the new
 * repository that a member opened after the change stays. The installation
 * follows the repository, because D1 keeps it on the repository row.
 */
export async function storeChangedRepository(
  options: RepositoryChangeOptions,
  job: RepositoryChangeJob,
) {
  const { DB: db } = options.env
  const { binding, target } = job
  const now = options.dependencies.now()
  const storedBase =
    job.baseBranch === target.binding.defaultBranch ? null : job.baseBranch
  await db.batch([
    db
      .prepare(DROP_FILE_TABS)
      .bind(now, binding.id, ...oldWorkspaceBindings(job)),
    db
      .prepare(
        `UPDATE workspaces SET repository_id = ?, branch = ?, base_branch = ?, github_summary = NULL,
        task_number = task_number + 1, updated_at = MAX(updated_at, ?)
      WHERE ${OLD_WORKSPACE}`,
      )
      .bind(
        target.repositoryId,
        job.branch,
        storedBase,
        now,
        ...oldWorkspaceBindings(job),
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
    (row.baseBranch ?? target.binding.defaultBranch) !== job.baseBranch ||
    row.sandboxId !== job.sandboxId ||
    row.providerAccount !== job.providerAccount
  )
    throw new Error('The repository change publication is pending.')
  return row
}
