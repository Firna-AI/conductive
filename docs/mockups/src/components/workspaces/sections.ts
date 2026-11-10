import {
  defaultSection,
  sectionKeys,
  sections,
  type Section,
  type SectionKey,
} from '../../fixtures/sections'
import {
  archivedWorkspaceList,
  keptArchives,
} from '../../fixtures/archivedWorkspaces'
import type { GitHubSummary } from '../../fixtures/pullRequests'
import {
  checkoutAutocomplete,
  workspaceList,
  type ActivityStatus,
  type Workspace,
} from '../../fixtures/workspaces'
import { paths } from '../../paths'

export type WorkspaceRow = {
  workspace: Workspace
  status: ActivityStatus
  /** The GitHub state of its pull request, which its mark shows in colour. */
  github: GitHubSummary | null
  selected: boolean
  /** The screen that opening this workspace shows, when the mockups draw it. */
  to?: string
  /**
   * An archived workspace whose last day of Restore has not passed, so that
   * its row offers Restore, except in a suspended org.
   */
  restoreOpen?: boolean
}

export type SidebarSection = {
  section: Section
  rows: readonly WorkspaceRow[]
}

/**
 * The workspace that the main area shows, with its current status. A
 * workspace screen gives its `workspace.github` the GitHub state of its
 * pull request bar, so that its row and its bar agree.
 */
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
  created: readonly OpenWorkspace[] = [],
): WorkspaceRow {
  const isOpen = open !== undefined && workspace.key === open.workspace.key
  if (!isOpen && workspace.key === needsInput) {
    // Only the Mac app draws this state, so the row opens its request.
    return {
      workspace: { ...workspace, updated: 'now' },
      status: 'input',
      github: workspace.github,
      selected: false,
      to: paths.macPrompt,
    }
  }
  const made = created.find((item) => item.workspace.key === workspace.key)
  const busy = isOpen && liveStatuses.has(open.status)
  return {
    workspace: busy ? { ...workspace, updated: 'now' } : workspace,
    status: isOpen ? open.status : (made?.status ?? workspace.status),
    github: isOpen ? open.workspace.github : workspace.github,
    selected: isOpen,
    to: linkFor(workspace.key, isOpen),
  }
}

/**
 * The sections of the org, each with its workspaces. The open workspace
 * shows its current status and the GitHub state of its pull request bar,
 * and a new one joins the top of its section.
 * `needsInput` marks a workspace whose agent waits for the user while the
 * main area shows another page. `created` adds the workspaces that the
 * create flow made by the time of the screen, with their states, at the
 * top of their sections.
 */
export function workspaceSections(
  open?: OpenWorkspace,
  needsInput?: string,
  created: readonly OpenWorkspace[] = [],
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
      .map((workspace) => rowFor(workspace, open, needsInput, created)),
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
 * that minute. The GitHub state stays, and the open workspace shows the
 * state of its pull request bar. The row opens the workspace in the
 * suspended org.
 */
function suspendedRow(workspace: Workspace, open?: Workspace): WorkspaceRow {
  return {
    workspace:
      workspace.updated === 'now' ? { ...workspace, updated: '1m' } : workspace,
    status: 'stopped',
    github: open?.key === workspace.key ? open.github : workspace.github,
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

/** The sections of a list and the rows of its open Archived group. */
export type ArchivedList = {
  sections: SidebarSection[]
  archived: WorkspaceRow[]
}

/**
 * The sections without a workspace that Archive moved to the Archived
 * group. In a suspended org the other rows show stopped.
 */
function sectionsWithout(key: string, suspended: boolean): SidebarSection[] {
  return sectionKeys.map((sectionKey) => ({
    section: sections[sectionKey],
    rows: workspaceList
      .filter((item) => item.section === sectionKey && item.key !== key)
      .map((item) => (suspended ? suspendedRow(item) : rowFor(item))),
  }))
}

/**
 * The sections after the open workspace was archived. It leaves its section
 * for the open Archived group. `restoreOpen` says whether its last day of
 * Restore has not passed.
 */
export function archivedSections(
  open: Workspace,
  suspended = false,
  restoreOpen = true,
): ArchivedList {
  const archived: WorkspaceRow = {
    workspace: open,
    status: 'archived',
    github: open.github,
    selected: true,
    restoreOpen,
  }
  return {
    sections: sectionsWithout(open.key, suspended),
    archived: [archived],
  }
}

/**
 * The list of Acme after the archive of Checkout address autocomplete, with
 * the Archived group open and no workspace open. The last archived workspace
 * comes first and opens its archived screen.
 */
export function archivedGroup(): ArchivedList {
  const last: WorkspaceRow = {
    workspace: checkoutAutocomplete,
    status: 'archived',
    github: checkoutAutocomplete.github,
    selected: false,
    to: paths.archive,
    restoreOpen: true,
  }
  const older = archivedWorkspaceList.map((workspace): WorkspaceRow => ({
    workspace,
    status: 'archived',
    github: workspace.github,
    selected: false,
    restoreOpen: keptArchives.has(workspace.key),
  }))
  return {
    sections: sectionsWithout(checkoutAutocomplete.key, false),
    archived: [last, ...older],
  }
}
