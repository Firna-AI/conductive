import type { Agent, AgentChoice } from './agents'
import type { Timestamp, User } from './api'

export const ACCOUNT_PATHS = {
  account: '/api/account',
  defaultModel: '/api/account/default-model',
  newWorkspaceView: '/api/account/new-workspace-view',
  agentLogins: '/api/account/agent-logins',
  githubInstallations: '/api/account/github-installations',
  githubRepositories: '/api/account/github-repositories',
  deleteAccount: '/api/account/delete',
} as const

export const NEW_WORKSPACE_VIEWS = ['page', 'dialog'] as const
export type NewWorkspaceView = (typeof NEW_WORKSPACE_VIEWS)[number]

export function agentLoginPath(agent: Agent): string {
  return `${ACCOUNT_PATHS.agentLogins}/${agent}`
}

/** Secrets occur only in writes and runner commands, never in account responses. */
export type SaveAgentLoginRequest =
  | { agent: 'claude'; kind: 'token' | 'api-key'; secret: string }
  | { agent: 'codex'; kind: 'api-key'; secret: string }

export type AgentLoginStatus =
  | { agent: Agent; connected: false }
  | {
      agent: 'claude'
      connected: true
      kind: 'token' | 'api-key'
      updatedAt: Timestamp
    }
  | {
      agent: 'codex'
      connected: true
      kind: 'api-key'
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
  defaultChoice: AgentChoice
  newWorkspaceView: NewWorkspaceView
  agentLogins: readonly AgentLoginStatus[]
  /**
   * The page of the shared GitHub App on GitHub. It lists the GitHub
   * accounts of the person. An account with the app opens the settings
   * of its installation, where the person chooses the repositories that
   * the app reaches. Another account installs the app.
   */
  githubAppUrl: string
}

export interface SessionResponse {
  user: User
}

export type SaveAgentLoginResponse = AgentLoginStatus
export interface SetDefaultModelRequest {
  choice: AgentChoice
}
export type SetDefaultModelResponse = SetDefaultModelRequest
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

export interface DeleteAccountResponse {
  deleted: true
}
