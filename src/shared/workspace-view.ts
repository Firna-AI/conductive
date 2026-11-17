import type { WorkspaceViewWire } from './workspace-view-wire'
import { workspacePath } from './workspaces'

export function workspaceViewPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/view`
}

export type WorkspaceTab =
  | { kind: 'session'; sessionId: string }
  | { kind: 'file'; path: string; mode: 'preview' | 'source' }
  | { kind: 'diff'; path: string }
  /** The Preview tab of one port of the sandbox. A port has at most one. */
  | { kind: 'preview'; port: number }

/** Whether a value is a port that a Preview tab can name: 1 to 65535. */
export function isTabPort(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65535
  )
}

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
  /** The view in the shape of the route, as `WorkspaceViewWire` says. */
  view: WorkspaceViewWire
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
export type UpdateWorkspaceViewRequest = WorkspaceViewWire
