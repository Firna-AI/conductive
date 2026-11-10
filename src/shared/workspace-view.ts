import { workspacePath } from './workspaces'

export function workspaceViewPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/view`
}

export type WorkspaceTab =
  | { kind: 'session'; sessionId: string }
  | { kind: 'file'; path: string; mode: 'preview' | 'source' }
  | { kind: 'diff'; path: string }
  | { kind: 'conductor-document'; documentId: string }

/** The server keeps view state. Only panel widths stay in the browser. */
export interface WorkspaceView {
  tabs: readonly WorkspaceTab[]
  activeTab: WorkspaceTab | null
  fileList: 'all' | 'changes' | 'checks'
  tool: 'terminal' | 'preview' | 'desktop'
}
export interface WorkspaceViewResponse {
  view: WorkspaceView
}
export type UpdateWorkspaceViewRequest = WorkspaceView
