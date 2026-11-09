import type { Agent, AgentChoice, AgentModel, Effort } from './agents'
import type { Workspace, WorkspaceState } from './workspaces'

/** Machine routes use workspace or turn tokens, or a GitHub webhook signature. */
export const MACHINE_PATHS = {
  runner: '/v1/runner',
  githubWebhook: '/v1/github/webhooks',
  gitCredential: '/v1/git/credential',
  workspaces: '/v1/tools/workspaces',
  claudeGateway: '/v1/model/claude',
  codexGateway: '/v1/model/codex',
  repositories: '/v1/tools/repositories',
  sections: '/v1/tools/sections',
  models: '/v1/tools/models',
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
  name?: string
}
export interface AgentCreateWorkspaceResponse {
  workspace: Workspace
  sessionId: string
}
export interface AgentWorkspaceSummary {
  id: string
  number: number
  link: string
  name: Workspace['name']
  branch: string
  state: WorkspaceState
}
export interface AgentListWorkspacesResponse {
  workspaces: readonly AgentWorkspaceSummary[]
}
export interface AgentListRepositoriesResponse {
  repositories: readonly {
    id: string
    fullName: string
    defaultBranch: string
    current: boolean
  }[]
}
export interface AgentListSectionsResponse {
  sections: readonly { id: string; name: string; default: boolean }[]
}
export interface AgentListModelsResponse {
  models: readonly AgentModel[]
  defaultChoice: AgentChoice | null
}
