import type { Agent, Effort } from './agents'
import type { Workspace, WorkspaceState } from './workspaces'

/** Machine routes use a workspace bearer token, never a browser session. */
export const MACHINE_PATHS = {
  runner: '/runner',
  githubWebhook: '/webhooks/github',
  gitCredential: '/git/credential',
  workspaces: '/tools/workspaces',
} as const

export interface AgentCreateWorkspaceRequest {
  repositoryId: string
  firstMessage: string
  model?: { agent: Agent; model: string }
  effort?: Effort
  sectionId?: string
}
export interface AgentCreateWorkspaceResponse {
  workspace: Workspace
  sessionId: string
}
export interface AgentWorkspaceSummary {
  id: string
  name: string
  branch: string
  state: WorkspaceState
}
export interface AgentListWorkspacesResponse {
  workspaces: readonly AgentWorkspaceSummary[]
}
