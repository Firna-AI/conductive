import type { DefaultAgentLogin } from './generated/DefaultAgentLogin'
import type { Agent } from './generated/Agent'
import type { AgentChoice } from './generated/AgentChoice'
import type { Timestamp } from './generated/Timestamp'
import type { User } from './api'
import type { ShortcutPreferences } from './shortcuts'

export interface SessionResponse {
  user: User
  appAccess: boolean
}

export const ACCOUNT_PATHS = {
  account: '/api/account',
  defaultModel: '/api/account/default-model',
  favourites: '/api/account/favourites',
  newWorkspaceView: '/api/account/new-workspace-view',
  shortcuts: '/api/account/shortcuts',
  agentLogins: '/api/account/agent-logins',
  codexDevice: '/api/account/agent-logins/codex/device',
  githubInstallations: '/api/account/github-installations',
  githubRepositories: '/api/account/github-repositories',
  deleteAccount: '/api/account/delete',
  stats: '/api/account/stats',
} as const

/**
 * The workspaces of the person in each state of the Stats tab, as the app
 * shows them: Archived counts the archived workspaces of the list, and
 * Removed those whose Restore ended. The Worker reply counts every archived
 * workspace in `archived`, so that an older app adds up, and the app takes
 * Removed out of it when it reads the reply.
 */
interface AccountWorkspaceStates {
  running: number
  stopped: number
  failed: number
  archived: number
  removed: number
}

/**
 * The counts of the Stats tab of the account, for the person signed in.
 * Deleted orgs and their records count nowhere. `readAt` is the read time.
 * Each list of days holds the 30 UTC days through `readAt`, oldest first.
 */
export interface AccountStats {
  readAt: Timestamp
  /** The orgs of the person. */
  orgs: number
  /** The workspaces that the person owns, and the new ones of 7 days. */
  workspaces: { total: number; lastWeek: number }
  /** The workspaces of the person by state. */
  workspaceStates: AccountWorkspaceStates
  /** The automations that the person owns. */
  automations: number
  newWorkspacesByDay: readonly { date: string; count: number }[]
  /** The runs that were not skipped, by the owner at the time of the run. */
  automationRunsByDay: readonly { date: string; count: number }[]
}

export const NEW_WORKSPACE_VIEWS = ['page', 'dialog'] as const
export type NewWorkspaceView = (typeof NEW_WORKSPACE_VIEWS)[number]

export function agentLoginPath(agent: Agent): string {
  return `${ACCOUNT_PATHS.agentLogins}/${agent}`
}

export function refreshAgentLoginModelsPath(agent: Agent): string {
  return `${agentLoginPath(agent)}/models/refresh`
}

export interface EndpointModelList {
  /** App model IDs absent from the last successful endpoint list. */
  missing: readonly string[]
  checkedAt: Timestamp
}

export function codexDevicePath(handle: string): string {
  return `${ACCOUNT_PATHS.codexDevice}/${encodeURIComponent(handle)}`
}

export interface StartCodexDeviceResponse {
  handle: string
  userCode: string
  verificationUrl: string
  expiresAt: Timestamp
  pollIntervalMs: number
}

export type PollCodexDeviceResponse =
  | { state: 'waiting'; pollIntervalMs: number }
  | { state: 'connected'; login: AgentLoginStatus }
  | { state: 'expired' }
  | { state: 'failed'; cause: string }

/** Secrets occur only in writes and runner commands, never in account responses. */
export type SaveAgentLoginRequest =
  | { agent: 'claude'; kind: 'token' | 'api-key'; secret: string }
  | { agent: 'codex'; kind: 'api-key'; secret: string }
  | { agent: Agent; kind: 'endpoint'; endpoint: string; secret: string }

type AgentLoginKinds = {
  [A in Agent]: Extract<AgentLoginStatus, { connected: true }>['kind']
}

const loginNoReuseDefaults: {
  [A in Agent]: Record<AgentLoginKinds[A], boolean>
} = {
  claude: { token: true, 'api-key': false, endpoint: false },
  codex: { token: true, 'api-key': false, endpoint: false },
}

export function defaultAgentLoginNoReuse<A extends Agent>(
  agent: A,
  kind: AgentLoginKinds[A],
): boolean {
  return loginNoReuseDefaults[agent][kind]
}

export type AgentLoginStatus =
  | { agent: Agent; connected: false }
  | {
      agent: 'claude'
      connected: true
      kind: 'token' | 'api-key'
      noReuse: boolean
      updatedAt: Timestamp
    }
  | {
      agent: 'codex'
      connected: true
      kind: 'token' | 'api-key'
      noReuse: boolean
      updatedAt: Timestamp
      unusableCause?: string
    }
  | {
      agent: Agent
      connected: true
      kind: 'endpoint'
      host: string
      modelList?: EndpointModelList
      noReuse: boolean
      updatedAt: Timestamp
    }

export interface GitHubInstallation {
  id: number
  account: string
  repositoryCount: number
  settingsUrl: string
}

/** A repository that the signed-in user and the GitHub App can both reach. */
export interface GitHubRepository {
  /** GitHub's numeric ID. An org does not need to exist yet. */
  githubId: number
  fullName: string
  description: string
  defaultBranch: string
  installationId: number
}

export interface AccountResponse {
  user: User
  operator: boolean
  defaultChoice: AgentChoice
  favourites: readonly AgentChoice[]
  newWorkspaceView: NewWorkspaceView
  shortcuts: ShortcutPreferences
  agentLogins: readonly AgentLoginStatus[]
  /** Resolved defaults by org and agent. Older account replies omit this field. */
  defaultLogins?: readonly DefaultAgentLogin[]
  /**
   * The page of the shared GitHub App on GitHub. It lists the GitHub
   * accounts of the person. An account with the app opens the settings
   * of its installation, where the person chooses the repositories that
   * the app reaches. Another account installs the app.
   */
  githubAppUrl: string
}

export type SaveAgentLoginResponse = AgentLoginStatus & {
  /** Endpoint saves only: true when a second model read selected a /v1 base. */
  endpointV1Added?: boolean
  /** Endpoint saves only: true when neither read produced a readable model list. */
  modelListReadFailed?: boolean
}

export interface RefreshAgentLoginModelsResponse {
  /** True when Refresh read no list, including a missing or native login. */
  modelListReadFailed: boolean
}
export interface UpdateAgentLoginRequest {
  noReuse: boolean
}
export type UpdateAgentLoginResponse = AgentLoginStatus
export interface SetDefaultModelRequest {
  choice: AgentChoice
}
export type SetDefaultModelResponse = SetDefaultModelRequest
export interface SetFavouritesRequest {
  favourites: readonly AgentChoice[]
}
export type SetFavouritesResponse = SetFavouritesRequest
export interface SetNewWorkspaceViewRequest {
  view: NewWorkspaceView
}
export type SetNewWorkspaceViewResponse = SetNewWorkspaceViewRequest
export interface GitHubInstallationsResponse {
  installations: readonly GitHubInstallation[]
  installUrl: string
}
export interface GitHubRepositoriesResponse {
  repositories: readonly GitHubRepository[]
}

/** The most favourites that an account keeps, and that the model menu shows. */
export const MODEL_FAVOURITES_LIMIT = 5

export function firstFavourites(
  choices: readonly AgentChoice[],
  onSkipped?: () => void,
): AgentChoice[] {
  const favourites: AgentChoice[] = []
  for (const selected of choices) {
    if (
      favourites.length === MODEL_FAVOURITES_LIMIT ||
      favourites.some(
        (saved) =>
          saved.agent === selected.agent &&
          saved.model === selected.model &&
          saved.effort === selected.effort &&
          saved.fast === selected.fast,
      )
    ) {
      onSkipped?.()
      continue
    }
    favourites.push(selected)
  }
  return favourites
}
