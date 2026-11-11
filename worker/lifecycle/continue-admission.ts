import type { User } from '../../src/shared/api'
import type { ContinueWorkspaceRequest } from '../../src/shared/workspaces'
import { requireActiveWorkspaceOwner } from '../data/user-access'
import { readMergeWorkspace } from '../github/merge-access'
import { HttpError } from '../http'
import { repositoryLocation } from './repository-locations'
import { workspaceRepositoryLocations } from './repository-location-data'
import { readWorkspace } from './workspace-data'
import { workspaceBranch } from './workspace-branch'
import {
  CONTINUE_JOB_KEY,
  continueJobKey,
  readContinueJob,
  type ContinueJob,
  type ContinueOptions,
} from './continue-types'

export async function reserveContinue(
  options: ContinueOptions,
  orgId: string,
  workspaceId: string,
  member: User,
  request: ContinueWorkspaceRequest,
): Promise<ContinueJob> {
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
  const existing = await readContinueJob(options.storage)
  if (existing && !existing.outcome) {
    if (
      existing.member.id === member.id &&
      existing.request.expectedBranch === request.expectedBranch
    )
      return existing
    throw continueBusy()
  }
  if (binding.branch !== request.expectedBranch)
    throw new HttpError(
      409,
      'workspace_branch_changed',
      'The workspace branch changed. Open the workspace and try again.',
    )
  const recovery = await options.chat.store.read(workspaceId, (view) =>
    view.lifecycleRecovery(),
  )
  if (recovery.runningTurns.length)
    throw new HttpError(
      409,
      'workspace_turn_running',
      'Continue waits for the agent to finish.',
    )
  const row = await readWorkspace(options.env.DB, orgId, workspaceId)
  await requireActiveWorkspaceOwner(options.env.DB, row.ownerUserId, orgId)
  if (!row.sandboxId)
    throw new HttpError(
      409,
      'sandbox_unavailable',
      'Open the workspace and try Continue again.',
    )
  const { branch } = await workspaceBranch(
    row.githubLogin,
    options.dependencies.randomToken,
  )
  const job: ContinueJob = {
    id: options.dependencies.randomToken(),
    binding,
    repositoryId: row.repositoryId,
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
    baseBranch: binding.defaultBranch,
    directory: repositoryLocation(
      await workspaceRepositoryLocations(options.env.DB, workspaceId),
      row.repositoryId,
    ),
    phase: 'verify',
    processId: null,
    commandStarted: false,
    resumeQueued: false,
    fetchId: options.dependencies.randomToken(),
    stdoutOffset: 0,
    stderrOffset: 0,
  }
  await options.storage.put(continueJobKey(job.id), job)
  await options.storage.put(CONTINUE_JOB_KEY, job)
  return job
}

export function continueBusy(): HttpError {
  return new HttpError(
    409,
    'workspace_continuing',
    'Continue is running. Wait for it to finish.',
  )
}
