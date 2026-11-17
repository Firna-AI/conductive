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
 * The ends of the archive of the shown workspace, or null while the page
 * opens. Restore ends at its last day while the page shows, with no other
 * event, and the workspace then leaves the list, also without a kept cloud
 * computer.
 */
export function useArchiveEnds(workspace: Workspace | null): ArchiveEnds {
  const restoreUntil = workspace?.restoreUntil ?? null
  const listEnd = workspace ? listEndOf(workspace) : null
  const passed = usePassedDeadlines([restoreUntil, listEnd])
  return { restoreEnded: passed(restoreUntil), removed: passed(listEnd) }
}
