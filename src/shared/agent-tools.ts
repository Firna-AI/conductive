import type { Agent, Effort } from './agents'
import type { Workspace, WorkspaceState } from './workspaces'

/** Machine routes use workspace bearer tokens or a GitHub webhook signature. */
export const MACHINE_PATHS = {
  runner: '/v1/runner',
  githubWebhook: '/v1/github/webhooks',
  gitCredential: '/v1/git/credential',
  workspaces: '/v1/tools/workspaces',
} as const

/** Register this local server. Runtime environment supplies its turn and token. */
export const WORKSPACE_TOOLS_MCP = {
  command: '/usr/local/bin/conductive',
  args: ['mcp'],
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
