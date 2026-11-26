import { usePassedDeadlines } from '../../app/deadlines'
import { listEndOf } from '../../app/workspace-removal'
import type { Workspace } from '../../shared/generated/Workspace'

/** Which ends of the archive of a workspace passed by the clock of the app. */
interface ArchiveEnds {
  /** The last day of Restore passed. */
  restoreEnded: boolean
  /** The workspace left the list, 14 days after its Archive. */
  removed: boolean
}

/**
 * The end of the 14 days of an archived workspace, which its notices give:
 * the end that the Worker sends with the state of its cloud computer. A
 * record of an older Worker has none, so the end comes from `archivedAt`,
 * as `listEndOf` says. Both give the same time, and the list keeps
 * `listEndOf`. Null when the record has neither, as a workspace that is not
 * archived.
 */
export function archiveEnd(workspace: Workspace): number | null {
  return workspace.archivedComputer?.restoreUntil ?? listEndOf(workspace)
}

/**
 * The ends of the archive of the shown workspace, or null while the page
 * opens. Restore ends at its last day while the page shows, with no other
 * event, and the workspace then leaves the list, also without a kept cloud
 * computer. Restore keeps the end of `restoreUntil`, which only a kept cloud
 * computer has.
 */
export function useArchiveEnds(workspace: Workspace | null): ArchiveEnds {
  const restoreUntil = workspace?.restoreUntil ?? null
  const end = workspace ? archiveEnd(workspace) : null
  const passed = usePassedDeadlines([restoreUntil, end])
  return { restoreEnded: passed(restoreUntil), removed: passed(end) }
}
