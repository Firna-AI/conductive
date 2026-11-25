import { plainData } from '../../../defined'
import {
  archivedGroup,
  workspaceSections,
  type SidebarSection,
  type WorkspaceRow,
} from '../../../components/workspaces/sections'
import { viewerMembership } from '../../../fixtures/members'
import type { SectionKey } from '../../../fixtures/sections'

/**
 * The data that the pages of the list parts show: the lists of Acme, as
 * the screens draw them, without the fields that a builder leaves
 * undefined, because the props of a Mokly page are JSON.
 */

/** The sections of Acme, with their rows, when the app opens. */
export const acmeSections: readonly SidebarSection[] =
  plainData(workspaceSections())

/**
 * The sections of Acme with "Move retries to a queue" open, in Infra,
 * which is collapsed.
 */
export const openInCollapsedSections: readonly SidebarSection[] =
  acmeSections.map((item) => ({
    ...item,
    rows: item.rows.map((row) => ({
      ...row,
      selected: row.workspace.key === 'retry-queue',
    })),
  }))

/** The rows of the Archived group of Acme, the last archived first. */
export const archivedRows: readonly WorkspaceRow[] = plainData(
  archivedGroup().archived,
)

/** Cal, an admin of Acme, who looks at the lists. */
export const adminViewer = viewerMembership('admin')

/** A section of Acme with its rows. */
export function acmeSection(key: SectionKey): SidebarSection {
  const item = acmeSections.find((entry) => entry.section.key === key)
  if (!item) throw new Error(`Acme has no section ${key}`)
  return item
}

/** The row of a workspace of Acme. */
export function acmeRow(key: string): WorkspaceRow {
  const row = acmeSections
    .flatMap((entry) => entry.rows)
    .find((entry) => entry.workspace.key === key)
  if (!row) throw new Error(`Acme has no workspace ${key}`)
  return row
}
