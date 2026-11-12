import type { Preview } from './previews'
import type { AgentWorkspaceSummary } from './agent-tools'
import { agentWorkspacePath } from './agent-workspaces.ts'

export interface AgentListPreviewsResponse {
  workspace: AgentWorkspaceSummary
  previews: readonly Preview[]
}

export interface AgentOpenPreviewResponse {
  workspace: AgentWorkspaceSummary
  preview: Preview
}

export interface AgentClosePreviewResponse {
  workspace: AgentWorkspaceSummary
  closed: boolean
}

export function agentPreviewsPath(workspaceId?: string): string {
  return `${agentWorkspacePath(workspaceId)}/previews`
}

export function agentPreviewClosePath(
  workspaceId: string | undefined,
  previewId: string,
): string {
  return `${agentPreviewsPath(workspaceId)}/${encodeURIComponent(previewId)}/close`
}
