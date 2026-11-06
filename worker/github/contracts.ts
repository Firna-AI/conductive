import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'
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
  retryAttempt?: number
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

export interface GitHubReadDependencies {
  fetch: HttpFetch
  token: GitHubTokenProvider
  now: () => number
}

export interface GitHubStateTransaction {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
}

export type GitHubUpdate = Extract<WorkspaceEvent, { type: 'github.updated' }>

export interface GitHubStatePort {
  transaction<T>(
    action: (transaction: GitHubStateTransaction) => Promise<T>,
  ): Promise<T>
  /** Append to the common workspace stream inside this same transaction. */
  appendEvent(
    transaction: GitHubStateTransaction,
    event: GitHubUpdate,
  ): Promise<WorkspaceEventEnvelope>
  /** Broadcast the committed envelope to every open tab. */
  publish(envelope: WorkspaceEventEnvelope): Promise<void>
  /** Persist plain request data for a fresh read after the given delay. */
  scheduleRefresh(request: GitHubRefreshRequest, delayMs: number): Promise<void>
}
