import type { User } from '../../src/shared/api'
import type { ChangeRepositoryRequest } from '../../src/shared/workspaces'
import { requireActiveWorkspaceOwner } from '../data/user-access'
import { readMergeWorkspace } from '../github/merge-access'
import { HttpError } from '../http'
import { continueBusy } from './continue-admission'
import { softwareOutdated } from './repository-change-errors'
import { pendingContinue } from './continue-types'
import { changeFolders, readChosenRepository } from './repository-change-target'
import {
  REPOSITORY_CHANGE_JOB_KEY,
  readRepositoryChangeJob,
  repositoryChangeBusy,
  repositoryChangeJobKey,
  type RepositoryChangeJob,
  type RepositoryChangeOptions,
} from './repository-change-types'
import { readWorkspace } from './workspace-data'
import { workspaceBranch } from './workspace-branch'

function sameRequest(
  left: ChangeRepositoryRequest,
  right: ChangeRepositoryRequest,
): boolean {
  return (
    left.expectedRepositoryId === right.expectedRepositoryId &&
    left.expectedBranch === right.expectedBranch &&
    left.repositoryId === right.repositoryId
  )
}

/** Admit a change in the chat queue. Every member of the org may change. */
export async function reserveRepositoryChange(
  options: RepositoryChangeOptions,
  orgId: string,
  workspaceId: string,
  member: User,
  request: ChangeRepositoryRequest,
): Promise<RepositoryChangeJob> {
  if (!options.matches(workspaceId))
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  await options.assertActive()
  const binding = await readMergeWorkspace(
    options.env.DB,
    orgId,
    workspaceId,
    member.id,
  )
  const existing = await readRepositoryChangeJob(options.storage)
  if (existing && !existing.outcome) {
    if (
      existing.member.id === member.id &&
      sameRequest(existing.request, request)
    )
      return existing
    throw repositoryChangeBusy()
  }
  if (await pendingContinue(options.storage)) throw continueBusy()
  const row = await readWorkspace(options.env.DB, orgId, workspaceId)
  if (
    row.repositoryId !== request.expectedRepositoryId ||
    binding.branch !== request.expectedBranch
  )
    throw new HttpError(
      409,
      'workspace_repository_changed',
      'The repository or the branch of the workspace changed. Open the workspace and try again.',
    )
  if (request.repositoryId === row.repositoryId)
    throw new HttpError(
      409,
      'workspace_repository_current',
      'The workspace already uses this repository.',
    )
  const repository = await readChosenRepository(
    options.env.DB,
    orgId,
    request.repositoryId,
  )
  const folders = await changeFolders(
    options.env.DB,
    workspaceId,
    row.repositoryId,
    repository,
  )
  const recovery = await options.chat.store.read(workspaceId, (view) =>
    view.lifecycleRecovery(),
  )
  if (recovery.runningTurns.length)
    throw new HttpError(
      409,
      'workspace_turn_running',
      'Wait for the agent to finish, then try again.',
    )
  const lifecycle = await options.lifecycle()
  if (
    lifecycle?.state === 'starting' &&
    lifecycle.softwareRestartAt !== undefined
  )
    throw new HttpError(
      409,
      'workspace_restarting',
      'The software is restarting. Try again when it is ready.',
    )
  const runner = await options.runner()
  if (
    runner.state === 'hello' &&
    (!runner.canMove || (folders.clone && !runner.addsRepositoryFolder))
  )
    throw softwareOutdated()
  await requireActiveWorkspaceOwner(options.env.DB, row.ownerUserId, orgId)
  if (!row.sandboxId)
    throw new HttpError(
      409,
      'sandbox_unavailable',
      'Open the workspace and try again.',
    )
  const { branch } = await workspaceBranch(
    row.githubLogin,
    options.dependencies.randomToken,
    { name: row.name, task: row.taskNumber + 1 },
  )
  const job: RepositoryChangeJob = {
    id: options.dependencies.randomToken(),
    binding,
    repositoryId: row.repositoryId,
    directory: folders.directory,
    target: {
      repositoryId: repository.id,
      fullName: repository.fullName,
      directory: folders.targetDirectory,
      ...(folders.clone ? { clone: folders.clone } : {}),
      binding: {
        id: workspaceId,
        orgId,
        branch,
        repositoryId: repository.githubRepositoryId,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        baseBranch: repository.defaultBranch,
        installationId: repository.installationId,
      },
    },
    sandboxId: row.sandboxId,
    providerAccount: row.providerAccount,
    member: {
      id: member.id,
      githubLogin: member.githubLogin,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
    },
    request,
    branch,
    baseBranch: repository.defaultBranch,
    phase: 'verify',
    processId: null,
    commandStarted: false,
    resumeQueued: false,
    fetchId: options.dependencies.randomToken(),
    stdoutOffset: 0,
    stderrOffset: 0,
  }
  await options.storage.put(repositoryChangeJobKey(job.id), job)
  await options.storage.put(REPOSITORY_CHANGE_JOB_KEY, job)
  return job
}
