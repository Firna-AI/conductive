import { workspacePath } from './workspaces'

export function workspaceViewPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/view`
}

export type WorkspaceTab =
  | { kind: 'session'; sessionId: string }
  | { kind: 'file'; path: string; mode: 'preview' | 'source' }
  | { kind: 'diff'; path: string }

/** The server keeps view state. Only panel sizes stay in the browser. */
export interface WorkspaceView {
  tabs: readonly WorkspaceTab[]
  activeTab: WorkspaceTab | null
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
  routine?: {
    id: string
    name: string
    pullRequest?: { number: number; url: string } | null
  } | null
}
export type UpdateWorkspaceViewRequest = WorkspaceView
