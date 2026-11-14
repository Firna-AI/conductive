import { workspacePath } from './workspaces'

export function workspaceViewPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/view`
}

export type WorkspaceTab =
  | { kind: 'session'; sessionId: string }
  | { kind: 'file'; path: string; mode: 'preview' | 'source' }
  | { kind: 'diff'; path: string }

export type TemporaryTab = { kind: 'file' | 'diff'; path: string }

/**
 * The server keeps view state. Only the panel sizes and the last workspace
 * of each org stay in the browser.
 */
export interface WorkspaceView {
  tabs: readonly WorkspaceTab[]
  activeTab: WorkspaceTab | null
  /** The temporary file or diff tab, in either display mode, or null. */
  temporaryTab: TemporaryTab | null
  fileList: 'all' | 'changes' | 'checks'
  tool: 'terminal' | 'preview' | 'desktop'
}
export interface WorkspaceViewResponse {
  view: WorkspaceView
  baseBranch?: string
  routine?: {
    id: string
    name: string
    pullRequest?: { number: number; url: string } | null
  } | null
}
export type UpdateWorkspaceViewRequest = WorkspaceView
