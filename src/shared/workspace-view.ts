import type { SkillIdentity } from './skills'
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

export interface SkillTabPlace extends SkillIdentity {
  /** The index of the skill tab in the whole tab row, from 0. */
  place: number
}

/**
 * The server keeps view state. Only the panel sizes and the last workspace
 * of each org stay in the browser.
 */
export interface WorkspaceView {
  tabs: readonly WorkspaceTab[]
  activeTab: WorkspaceTab | null
  /** The temporary file or diff tab, in either display mode, or null. */
  temporaryTab: TemporaryTab | null
  /** These fields are also the saved JSON and HTTP representation. */
  skillTabs?: readonly SkillTabPlace[]
  activeSkill?: SkillIdentity | null
  temporarySkill?: SkillIdentity | null
  fileList: 'all' | 'changes' | 'checks'
  tool: 'terminal' | 'preview' | 'desktop'
  terminal?: string
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
  /**
   * The repositories that the cloud computer holds, by ID, for the
   * repository menu. Null when the workspace has no record of its folders:
   * the menu then lists only the current repository. Only the read of the
   * view gives it.
   */
  heldRepositoryIds?: readonly string[] | null
  automation?: {
    id: string
    name: string
    pullRequest?: { number: number; url: string } | null
  } | null
}
export type UpdateWorkspaceViewRequest = WorkspaceViewWire
