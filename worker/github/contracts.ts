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

export interface GitHubRefresh {
  deliveryId?: string
  headSha?: string
  userId?: string
}

export type GitHubTokenProvider = (
  workspace: GitHubWorkspace,
) => Promise<string>

/** Run this callback inside the target workspace DO, using refreshWorkspace. */
export type GitHubRefreshWorkspace = (
  workspace: GitHubWorkspace,
  signal: GitHubRefresh,
) => Promise<GitHubSnapshot>

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
}
