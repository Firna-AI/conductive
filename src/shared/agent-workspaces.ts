import type { Agent, Effort } from './agents'
import { MACHINE_PATHS, type AgentWorkspaceSummary } from './agent-tools.ts'
import type { Workspace } from './workspaces'

export interface AgentCreateWorkspaceRequest {
  startBranch?: string
  baseBranch?: string
  repositoryId: string
  firstMessage: string
  model?: { agent: Agent; model: string }
  effort?: Effort
  sectionId?: string
  name?: string
  firstSessionTitle?: string
  requestId?: string
}
export interface AgentCreateWorkspaceResponse {
  workspace: Workspace
  sessionId: string
  sessionLink: string
}
interface AgentWorkspaceOwner {
  id: string
  githubLogin: string
  displayName: string | null
}

export interface AgentWorkspaceListEntry extends AgentWorkspaceSummary {
  owner: AgentWorkspaceOwner
}

export interface AgentListWorkspacesRequest {
  ownerId?: string
  state?: AgentWorkspaceSummary['state']
  repositoryId?: string
  query?: string
  updatedSince?: number
  archived?: boolean
  limit?: number
  offset?: number
}

export interface AgentListWorkspacesResponse {
  workspaces: readonly AgentWorkspaceListEntry[]
  hasMore?: boolean
}

export interface AgentWorkspaceDetail extends AgentWorkspaceListEntry {
  repository: { id: string; fullName: string; defaultBranch: string }
  baseBranch: string
  section: { id: string; name: string }
  createdAt: number
  lastActivityAt: number
  archivedAt: number | null
  restoreUntil: number | null
}

export interface AgentWorkspaceResponse {
  workspace: AgentWorkspaceDetail
}

export interface AgentRenameWorkspaceRequest {
  name: string
}

export interface AgentMoveWorkspaceRequest {
  sectionId: string
}

export function agentWorkspacePath(workspaceId = 'current'): string {
  return `${MACHINE_PATHS.workspaces}/${encodeURIComponent(workspaceId)}`
}

export const agentWorkspacePaths = {
  rename: (id?: string) => `${agentWorkspacePath(id)}/rename`,
  move: (id?: string) => `${agentWorkspacePath(id)}/move`,
  archive: (id?: string) => `${agentWorkspacePath(id)}/archive`,
} as const
