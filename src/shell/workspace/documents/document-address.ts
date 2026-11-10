import { routes } from '../../../app/router'
import type { WorkspaceTab } from '../../../shared/workspace-view'

/** The first part of the address of an old session from Conductor. */
const CONDUCTOR = 'conductor'

/** The tab of the saved view that shows an old session from Conductor. */
export type DocumentTab = Extract<WorkspaceTab, { kind: 'conductor-document' }>

/**
 * The old session from Conductor that the address after the workspace
 * shows, at `conductor/<document ID>`, or null for every other address.
 * It is not an address of the Files screens, so its open reads no file and
 * starts no cloud computer.
 */
export function documentPlace(view: readonly string[]): DocumentTab | null {
  const [area, documentId, ...rest] = view
  if (area !== CONDUCTOR || !documentId || rest.length > 0) return null
  return { kind: 'conductor-document', documentId }
}

/** The address of an old session from Conductor in its workspace. */
export function documentHref(
  orgId: string,
  workspaceId: string,
  documentId: string,
): string {
  return routes.workspace(orgId, workspaceId, CONDUCTOR, documentId)
}
