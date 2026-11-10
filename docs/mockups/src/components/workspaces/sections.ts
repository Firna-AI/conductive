import {
  conductorSection,
  defaultSection,
  sectionKeys,
  sections,
  type Section,
  type SectionKey,
} from '../../fixtures/sections'
import {
  workspaceList,
  type Workspace,
  type WorkspaceStatus,
} from '../../fixtures/workspaces'
import { paths } from '../../paths'

export type WorkspaceRow = {
  workspace: Workspace
  status: WorkspaceStatus
  selected: boolean
  /** The screen that opening this workspace shows, when the mockups draw it. */
  to?: string
  /**
   * The question that Archive opens for this workspace, when it is not the
   * question that the mockups draw for every row. Null keeps it static.
   */
  archiveTo?: string | null
}

export type SidebarSection = {
  section: Section
  rows: readonly WorkspaceRow[]
}

/** The workspace that the main area shows, with its current status. */
export type OpenWorkspace = { workspace: Workspace; status: WorkspaceStatus }

/** The section whose menu the list shows open. */
export type ListMenu = { section: SectionKey }

/**
 * A workspace that the user drags to another section: the list lifts its
 * row, and a line shows where it lands, before the row at `index`.
 */
export type ListDrag = {
  workspace: string
  section: SectionKey
  index: number
}

function linkFor(key: string, open: boolean): string | undefined {
  if (key === 'checkout-autocomplete') return open ? paths.app : paths.starting
  if (key === 'saved-carts') return paths.firstTurn
  return undefined
}

/** The open workspace has activity now, so its row shows no age. */
const liveStatuses: ReadonlySet<WorkspaceStatus> = new Set([
  'working',
  'input',
  'starting',
])

function rowFor(
  workspace: Workspace,
  open?: OpenWorkspace,
  needsInput?: string,
  created: readonly OpenWorkspace[] = [],
  openTo?: string,
): WorkspaceRow {
  const isOpen = open !== undefined && workspace.key === open.workspace.key
  if (!isOpen && workspace.key === needsInput) {
    // Only the Mac app draws this state, so the row opens its request.
    return {
      workspace: { ...workspace, updated: 'now' },
      status: 'input',
      selected: false,
      to: paths.macPrompt,
    }
  }
  const made = created.find((item) => item.workspace.key === workspace.key)
  const busy = isOpen && liveStatuses.has(open.status)
  return {
    workspace: busy ? { ...workspace, updated: 'now' } : workspace,
    status: isOpen ? open.status : (made?.status ?? workspace.status),
    selected: isOpen,
    to: (isOpen ? openTo : undefined) ?? linkFor(workspace.key, isOpen),
  }
}

/**
 * The sections of the org, each with its workspaces. The open workspace
 * shows its current status, and a new one joins the top of its section.
 * `needsInput` marks a workspace whose agent waits for the user while the
 * main area shows another page. `created` adds the workspaces that the
 * create flow made by the time of the screen, with their states, at the
 * top of their sections. `openTo` is the screen of the open workspace in
 * its state, which its selected row keeps, where the mockups draw one.
 */
export function workspaceSections(
  open?: OpenWorkspace,
  needsInput?: string,
  created: readonly OpenWorkspace[] = [],
  openTo?: string,
): SidebarSection[] {
  const isNew =
    open !== undefined &&
    !workspaceList.some((item) => item.key === open.workspace.key)
  const all = [
    ...created.map((item) => item.workspace),
    ...(isNew ? [open.workspace] : []),
    ...workspaceList,
  ]
  return sectionKeys.map((key) => ({
    section: sections[key],
    rows: all
      .filter((workspace) => workspace.section === key)
      .map((workspace) => rowFor(workspace, open, needsInput, created, openTo)),
  }))
}

/**
 * The question of Archive for an imported workspace that was never
 * activated, before its activation or after a failed one. It has no cloud
 * computer to check. An activated workspace gets the question of every
 * workspace.
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
 * The sections after an import from Conductor: Import from Conductor at
 * the top, with the workspaces of the import and their states, then the
 * other sections. A row opens its workspace, when the mockups draw it.
 * `open` is the workspace that the main area shows, and `openTo` the
 * screen of its current state, which its selected row keeps. Null keeps
 * that row static, for a state that no entry draws.
 */
export function sectionsWithImport(
  imported: readonly Workspace[],
  open?: OpenWorkspace,
  openTo?: string | null,
): SidebarSection[] {
  const rows = imported.map((workspace): WorkspaceRow => {
    const isOpen = workspace.key === open?.workspace.key
    const to = workspace.key === 'coupon-totals' ? paths.imported : undefined
    const status = isOpen ? open.status : workspace.status
    return {
      workspace,
      status,
      selected: isOpen,
      to: isOpen ? openRow(openTo, to) : to,
      archiveTo:
        workspace.key === 'coupon-totals'
          ? (importedArchive(status) ?? null)
          : null,
    }
  })
  return [{ section: conductorSection, rows }, ...workspaceSections(open)]
}

/**
 * The sections after an imported workspace was archived before its
 * activation. It leaves Import from Conductor for the open Archived group,
 * where its row keeps `openTo`, and the other workspaces of the import
 * stay in their section. Null keeps that row static.
 */
export function archivedWithImport(
  open: Workspace,
  imported: readonly Workspace[],
  openTo?: string | null,
): { sections: SidebarSection[]; archived: WorkspaceRow[] } {
  const others = imported.filter((item) => item.key !== open.key)
  const archived: WorkspaceRow = {
    workspace: open,
    status: 'archived',
    selected: true,
    to: openTo ?? undefined,
  }
  return { sections: sectionsWithImport(others), archived: [archived] }
}

/** A new org: its default section, with no workspaces yet. */
export function newOrgSections(): SidebarSection[] {
  return [{ section: sections[defaultSection], rows: [] }]
}

/**
 * The row of a workspace in a suspended org. The suspension a minute ago
 * stops every cloud computer of the org and refuses every start, so the row
 * shows stopped, as a refused start does, and a row that had activity shows
 * that minute. The row opens the workspace in the suspended org.
 */
function suspendedRow(workspace: Workspace, open?: Workspace): WorkspaceRow {
  return {
    workspace:
      workspace.updated === 'now' ? { ...workspace, updated: '1m' } : workspace,
    status: 'stopped',
    selected: workspace.key === open?.key,
    to:
      workspace.key === 'checkout-autocomplete'
        ? paths.suspendedWorkspace
        : undefined,
  }
}

/**
 * The sections of a suspended org, with every row stopped. `open` is the
 * workspace that the main area shows.
 */
export function suspendedSections(open?: Workspace): SidebarSection[] {
  return sectionKeys.map((key) => ({
    section: sections[key],
    rows: workspaceList
      .filter((workspace) => workspace.section === key)
      .map((workspace) => suspendedRow(workspace, open)),
  }))
}

/**
 * The sections after the open workspace was archived. It leaves its section
 * for the open Archived group. In a suspended org the other rows show
 * stopped.
 */
export function archivedSections(
  open: Workspace,
  suspended = false,
): {
  sections: SidebarSection[]
  archived: WorkspaceRow[]
} {
  const list = sectionKeys.map((key) => ({
    section: sections[key],
    rows: workspaceList
      .filter((item) => item.section === key && item.key !== open.key)
      .map((item) => (suspended ? suspendedRow(item) : rowFor(item))),
  }))
  const archived: WorkspaceRow = {
    workspace: open,
    status: 'archived',
    selected: true,
  }
  return { sections: list, archived: [archived] }
}
