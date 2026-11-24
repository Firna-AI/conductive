import type { Workspace } from '../../src/shared/generated/Workspace'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type {
  ChangeRepositoryRequest,
  ChangeRepositoryResponse,
} from '../../src/shared/workspaces'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatData } from '../chat/types'
import type { AppDependencies, AppEnv } from '../env'
import type { FeatureResult } from '../features/result'
import type { BranchWork } from '../github/branch-work'
import type { GitHubWorkspace } from '../github/contracts'
import { HttpError } from '../http'
import type { CommandRoute } from '../machines/channel'
import { pendingContinue } from './continue-types'
import type { DurableLifecycleState } from './durable-types'

export const REPOSITORY_CHANGE_JOB_KEY = 'lifecycle:repository-change'
export const repositoryChangeJobKey = (id: string) =>
  `repository-change:job:${id}`
/** Names the change that moved the workspace away from this repository and branch. */
export const repositoryChangedKey = (repositoryId: string, branch: string) =>
  `repository-change:from:${encodeURIComponent(repositoryId)}:${encodeURIComponent(branch)}`

type StoredReply =
  | Exclude<
      ChangeRepositoryResponse,
      { state: 'changed' } | { state: 'pending' }
    >
  | {
      state: 'changed'
      workspace: Omit<Workspace, 'link'>
      eventNumber: number
    }

/** The GitHub facts of the old branch for the question. */
type OldBranchWork = BranchWork

/** The new repository of a change, and its folder in the sandbox. */
interface RepositoryChangeTarget {
  repositoryId: string
  fullName: string
  directory: string
  /** The GitHub binding of the new repository, with the new branch. */
  binding: GitHubWorkspace
}

export interface RepositoryChangeJob {
  id: string
  /** The GitHub binding of the old repository and the old branch. */
  binding: GitHubWorkspace
  repositoryId: string
  directory: string
  target: RepositoryChangeTarget
  sandboxId: string
  providerAccount: string
  member: MessageSender
  request: ChangeRepositoryRequest
  branch: string
  baseBranch: string
  phase: 'verify' | 'resume' | 'runner' | 'check' | 'fetch' | 'move' | 'publish'
  oldBranch?: OldBranchWork
  /** When the job began to wait for a runner that can move. */
  runnerSince?: number
  processId: number | null
  commandRoute?: CommandRoute
  commandStarted: boolean
  resumeQueued: boolean
  fetchId: string
  stdoutOffset: number
  stderrOffset: number
  publication?: { after: number; through: number }
  failure?: { status: number; code: string; message: string }
  /**
   * The time of the first failed advance. See `retries` in `repository-change.ts`.
   * A job of an older deploy has no value until its next failure.
   */
  failingSince?: number
  cancelled?: true
  outcome?: FeatureResult<StoredReply>
}

/** The runner connection that the job sees. */
export type RunnerView =
  { state: 'none' } | { state: 'hello'; canMove: boolean }

export interface RepositoryChangeOptions {
  env: AppEnv
  dependencies: AppDependencies
  storage: Pick<ChatData, 'get' | 'put'>
  chat: WorkspaceChat
  run<T>(operation: () => Promise<T>): Promise<T>
  schedule(at: number | null): Promise<void>
  /** The default branch of the new repository, read while the record names the old one. */
  defaultBranch(
    current: GitHubWorkspace,
    target: GitHubWorkspace,
    userId: string,
  ): Promise<string>
  oldBranchWork(
    binding: GitHubWorkspace,
    userId: string,
  ): Promise<OldBranchWork>
  scheduleRefresh(binding: GitHubWorkspace): Promise<void>
  resume(orgId: string, workspaceId: string, userId: string): Promise<void>
  lifecycle(): Promise<DurableLifecycleState | null>
  runner(): Promise<RunnerView>
  /** Move a connected runner to the record folder. Call inside `run`. */
  moveRunner(): Promise<void>
  matches(workspaceId: string): boolean
  assertActive(): Promise<void>
  activity(): Promise<void>
}

export function readRepositoryChangeJob(
  storage: RepositoryChangeOptions['storage'],
  key = REPOSITORY_CHANGE_JOB_KEY,
): Promise<RepositoryChangeJob | null | undefined> {
  return storage.get<RepositoryChangeJob | null>(key)
}

export async function pendingRepositoryChange(
  storage: RepositoryChangeOptions['storage'],
): Promise<boolean> {
  return Boolean(await readRepositoryChangeJob(storage))
}

/** Continue and a repository change each hold the workspace while they run. */
export async function pendingWorkspaceChange(
  storage: RepositoryChangeOptions['storage'],
): Promise<boolean> {
  return (
    (await pendingContinue(storage)) || (await pendingRepositoryChange(storage))
  )
}

export function repositoryChangeBusy(): HttpError {
  return new HttpError(
    409,
    'workspace_repository_changing',
    'The repository change is running. Wait for it to finish.',
  )
}
