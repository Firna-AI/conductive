import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../chat/workspace-events'
import type {
  GitHubBanner,
  GitHubChecksResponse,
} from '../../src/shared/github'
import type { HttpFetch } from '../env'

export interface GitHubWorkspace {
  id: string
  orgId: string
  branch: string
  repositoryId: number
  fullName: string
  defaultBranch: string
  baseBranch?: string | null
  installationId: number
}

export interface GitHubSnapshot {
  banner: GitHubBanner
  checks: GitHubChecksResponse
  headSha: string | null
}

/** The current branch, comparison base, and commit used by one read. */
export interface GitHubBranchDependencies {
  headBranch: string
  headSha: string | null
  baseBranch: string
  fullName: string
  pullNumber: number | null
}

export interface GitHubRefresh {
  deliveryId?: string
  userId?: string
  pushBranch?: string
  /** A check event that names no branch. Read only an open pull request. */
  openPullRequestOnly?: true
  retryAttempt?: number
  requireWritable?: true
}

export interface GitHubRefreshRequest {
  workspace: GitHubWorkspace
  signal: GitHubRefresh
}

export type GitHubTokenProvider = (
  workspace: GitHubWorkspace,
) => Promise<string>

/** Run inside the workspace DO. An unrelated push returns null. */
export type GitHubRefreshWorkspace = (
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
) => Promise<GitHubSnapshot | null>

/** Run inside the workspace DO. It reads storage only, never GitHub. */
export type GitHubStoredState = (
  workspace: GitHubWorkspace,
) => Promise<GitHubSnapshot | undefined>

export interface GitHubReadDependencies {
  fetch: HttpFetch
  token: GitHubTokenProvider
  now: () => number
}

export interface GitHubStateTransaction {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  emit(event: GitHubUpdate): Promise<WorkspaceEventEnvelope>
}

export type GitHubUpdate = Extract<WorkspaceEvent, { type: 'github.updated' }>

export interface GitHubStateOperation {
  transaction<T>(
    action: (transaction: GitHubStateTransaction) => Promise<T>,
  ): Promise<T>
  publish(envelope: WorkspaceEventEnvelope): Promise<void>
}

export interface GitHubStatePort {
  read<T>(key: string): Promise<T | undefined>
  /** Check access after queue entry, then commit or replay in that same task. */
  run<T>(
    authorize: () => Promise<void>,
    work: (operation: GitHubStateOperation) => Promise<T>,
  ): Promise<T>
  /** Persist plain request data for a fresh read after the given delay. */
  scheduleRefresh(request: GitHubRefreshRequest, delayMs: number): Promise<void>
}
