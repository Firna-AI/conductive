import { conductorSection } from '../../fixtures/sections'
import type { Workspace, WorkspaceStatus } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import {
  workspaceSections,
  type ArchivedList,
  type OpenWorkspace,
  type SidebarSection,
  type WorkspaceRow,
} from './sections'

/**
 * The question of Archive for an imported workspace that was never
 * activated, before its activation or after a failed one. It has no cloud
 * computer to check. An activated workspace archives at once, as every
 * workspace does.
 */
function importedArchive(status: WorkspaceStatus): string | undefined {
  if (status === 'inactive') return paths.importedArchive
  if (status === 'error') return paths.importedArchiveFailed
  return undefined
}

/**
 * The screen of a selected imported row: the screen of its state, none for
 * a state that no entry draws, or its usual screen when the caller names no
 * state.
 */
function openRow(
  openTo: string | null | undefined,
  usual: string | undefined,
): string | undefined {
  if (openTo === undefined) return usual
  return openTo ?? undefined
}

/**
 * Where the row of the drawn imported workspace leads, where it differs
 * from its default.
 */
type ImportRowLinks = Readonly<{
  /**
   * False keeps the row and its Archive static, where the list differs
   * from the drawn list after the import. Without it, the row is live.
   */
  live?: boolean
  /**
   * What Archive of the open row opens, from the state of its screen, or of
   * the drawn row in a list without an open workspace, such as the question
   * over the list. Without it, the question follows the status of the row.
   */
  archiveTo?: string | null
}>

/**
 * The sections after an import from Conductor: Import from Conductor at
 * the top, with the workspaces of the import and their states, then the
 * other sections. A row opens its workspace, when the mockups draw it.
 * `open` is the workspace that the main area shows, and `openTo` the
 * screen of its current state, which its selected row keeps. Null keeps
 * that row static, for a state that no entry draws. `links` can keep the
 * rows static, or give the open row its own Archive question.
 */
export function sectionsWithImport(
  imported: readonly Workspace[],
  open?: OpenWorkspace,
  openTo?: string | null,
  links: ImportRowLinks = {},
): SidebarSection[] {
  const rows = imported.map((workspace): WorkspaceRow => {
    const isOpen = workspace.key === open?.workspace.key
    const drawn = workspace.key === 'coupon-totals' && (links.live ?? true)
    const to = drawn ? paths.imported : undefined
    const status = isOpen ? open.status : workspace.status
    const own = isOpen || open === undefined
    const archiveTo =
      own && links.archiveTo !== undefined
        ? links.archiveTo
        : (importedArchive(status) ?? null)
    return {
      workspace,
      status,
      selected: isOpen,
      to: isOpen ? openRow(openTo, to) : to,
      archiveTo: drawn ? archiveTo : null,
    }
  })
  return [{ section: conductorSection, rows }, ...workspaceSections(open)]
}

/**
 * The Restore of the row of an archived workspace from Conductor: whether
 * the app still keeps its cloud computer, so the row offers Restore, and
 * the screen of the workspace back in its section. A workspace archived
 * before its activation has no kept cloud computer.
 */
type ImportRestore = Readonly<{ open: boolean; to: string | null }>

/**
 * The sections after an imported workspace was archived. It leaves Import
 * from Conductor for the open Archived group, where its row keeps
 * `openTo`, and the other workspaces of the import stay in their section.
 * Null keeps that row static. `restore` says whether the row offers
 * Restore, and where Restore leads.
 */
export function archivedWithImport(
  open: Workspace,
  imported: readonly Workspace[],
  openTo?: string | null,
  restore: ImportRestore = { open: false, to: null },
): ArchivedList {
  const others = imported.filter((item) => item.key !== open.key)
  const archived: WorkspaceRow = {
    workspace: open,
    status: 'archived',
    selected: true,
    to: openTo ?? undefined,
    restoreOpen: restore.open,
    restoreTo: restore.to,
  }
  return { sections: sectionsWithImport(others), archived: [archived] }
}
