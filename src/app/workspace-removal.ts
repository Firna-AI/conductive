import type { Workspace } from '../shared/generated/Workspace'
import { WORKSPACE_RESTORE_MS, workspaceRemovedAt } from '../shared/workspaces'

/** What the removal of a workspace reads: the time of its Archive. */
export type ArchiveTime = Pick<Workspace, 'archivedAt'>

/**
 * The time when an archived workspace leaves the list: the end of its
 * Restore, 14 days after the Archive. The time is the same without a kept
 * cloud computer, so it never reads `restoreUntil`. Null for a workspace
 * that is not archived.
 */
export function listEndOf(workspace: ArchiveTime): number | null {
  return workspace.archivedAt === null
    ? null
    : workspace.archivedAt + WORKSPACE_RESTORE_MS
}

/**
 * Whether the list shows the workspace at `now`. A removed workspace, whose
 * Restore ended, leaves the list, its counts, and the command palette, and
 * only a link opens it. The app keeps its record in the list of the org,
 * so its links still resolve.
 */
function isListed(workspace: ArchiveTime, now: number): boolean {
  return workspaceRemovedAt(workspace.archivedAt, now) === null
}

/** The workspaces that the list shows at `now`, in their order. */
export function listedWorkspaces<Item extends ArchiveTime>(
  workspaces: readonly Item[],
  now: number,
): Item[] {
  return workspaces.filter((workspace) => isListed(workspace, now))
}
