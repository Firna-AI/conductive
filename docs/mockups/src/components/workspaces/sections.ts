import {
  defaultSection,
  sectionKeys,
  sections,
  type Section,
  type SectionKey,
} from '../../fixtures/sections'
import {
  workspaceList,
  type ActivityStatus,
  type Workspace,
} from '../../fixtures/workspaces'
import { paths } from '../../paths'

export type WorkspaceRow = {
  workspace: Workspace
  status: ActivityStatus
  selected: boolean
  /** The screen that opening this workspace shows, when the mockups draw it. */
  to?: string
}

export type SidebarSection = {
  section: Section
  rows: readonly WorkspaceRow[]
}

/** The workspace that the main area shows, with its current status. */
export type OpenWorkspace = { workspace: Workspace; status: ActivityStatus }

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
const liveStatuses: ReadonlySet<ActivityStatus> = new Set([
  'working',
  'input',
  'starting',
])

function rowFor(
  workspace: Workspace,
  open?: OpenWorkspace,
  needsInput?: string,
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
  const busy = isOpen && liveStatuses.has(open.status)
  return {
    workspace: busy ? { ...workspace, updated: 'now' } : workspace,
    status: isOpen ? open.status : workspace.status,
    selected: isOpen,
    to: linkFor(workspace.key, isOpen),
  }
}

/**
 * The sections of the org, each with its workspaces. The open workspace
 * shows its current status, and a new one joins the top of its section.
 * `needsInput` marks a workspace whose agent waits for the user while the
 * main area shows another page.
 */
export function workspaceSections(
  open?: OpenWorkspace,
  needsInput?: string,
): SidebarSection[] {
  const isNew =
    open !== undefined &&
    !workspaceList.some((item) => item.key === open.workspace.key)
  const all = isNew ? [open.workspace, ...workspaceList] : workspaceList
  return sectionKeys.map((key) => ({
    section: sections[key],
    rows: all
      .filter((workspace) => workspace.section === key)
      .map((workspace) => rowFor(workspace, open, needsInput)),
  }))
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
