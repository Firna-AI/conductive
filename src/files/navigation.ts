import type { LineRange } from '../shared/line-target'
import type { WorkspaceTab, WorkspaceView } from '../shared/workspace-view'

/** The list of the files panel: All files, Changes, or Checks. */
export type FileListKind = WorkspaceView['fileList']

/** A file tab of the centre column, as the workspace view names it. */
export type FileTab = Extract<WorkspaceTab, { kind: 'file' }>

/** A diff tab of the centre column, as the workspace view names it. */
export type DiffTab = Extract<WorkspaceTab, { kind: 'diff' }>

export type FilesTab = FileTab | DiffTab

/** Rendered Markdown, or the text of the file. */
export type FileMode = FileTab['mode']

/** Where a link of the Files screens leads. */
export type FilesTarget = FilesTab | { kind: 'list'; list: FileListKind }

/**
 * The navigation of the shell. `href` gives each target its own address, so
 * a link also opens in a new browser tab. `navigate` handles a plain click
 * without a page load, and updates the workspace view on the Worker. A file
 * tab with `lines` shows them in view and marked. Only the address holds
 * the lines, not the workspace view.
 */
export interface FilesNavigation {
  href(target: FilesTarget, lines?: LineRange): string
  navigate(target: FilesTarget, lines?: LineRange): void
}

/** The desktop layout, or the phone layout with 44 px touch targets. */
export type FilesLayout = 'desktop' | 'phone'

/** True when a tab of the workspace view shows this file tab or diff tab. */
export function isFilesTab(tab: WorkspaceTab | null): tab is FilesTab {
  return tab !== null && (tab.kind === 'file' || tab.kind === 'diff')
}

/** Splits a repository path into its folder and its file name. */
export function splitPath(path: string): { folder: string; name: string } {
  const slash = path.lastIndexOf('/')
  return slash < 0
    ? { folder: '', name: path }
    : { folder: path.slice(0, slash), name: path.slice(slash + 1) }
}
