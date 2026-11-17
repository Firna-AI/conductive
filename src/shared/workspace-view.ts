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
export interface WorkspacePane {
  tabs: readonly WorkspaceTab[]
  activeTab: WorkspaceTab | null
  /** The temporary file or diff tab, in either display mode, or null. */
  temporaryTab: TemporaryTab | null
}

export interface WorkspaceView {
  panes: readonly [WorkspacePane] | readonly [WorkspacePane, WorkspacePane]
  focusedPane: 0 | 1
  fileList: 'all' | 'changes' | 'checks'
  tool: 'terminal' | 'preview' | 'desktop'
}
export interface WorkspaceViewResponse {
  view: WorkspaceView
  baseBranch?: string
  /**
   * The folder of the workspace repository in the cloud computer, such as
   * `/home/user/code/checkout`, or null before the first start. Only the
   * read of the view gives it.
   */
  repositoryFolder?: string | null
  automation?: {
    id: string
    name: string
    pullRequest?: { number: number; url: string } | null
  } | null
}
export type UpdateWorkspaceViewRequest = WorkspaceView
