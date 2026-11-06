import type { Agent, AgentChoice } from './agents'
import type { Timestamp, User } from './api'

export const ACCOUNT_PATHS = {
  account: '/api/account',
  defaultModel: '/api/account/default-model',
  agentLogins: '/api/account/agent-logins',
  githubInstallations: '/api/account/github-installations',
  deleteAccount: '/api/account/delete',
} as const

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

export interface AccountResponse {
  user: User
  defaultChoice: AgentChoice
  agentLogins: readonly AgentLoginStatus[]
}

export interface SessionResponse {
  user: User
}

export interface AgentLoginsResponse {
  agentLogins: readonly AgentLoginStatus[]
}

export type SaveAgentLoginResponse = AgentLoginStatus
export interface SetDefaultModelRequest {
  choice: AgentChoice
}
export type SetDefaultModelResponse = SetDefaultModelRequest
export interface GitHubInstallationsResponse {
  installations: readonly GitHubInstallation[]
  installUrl: string
}

export interface DeleteAccountResponse {
  deleted: true
}
