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

function rowFor(workspace: Workspace, open?: OpenWorkspace): WorkspaceRow {
  const isOpen = open !== undefined && workspace.key === open.workspace.key
  const busy =
    isOpen && (open.status === 'working' || open.status === 'starting')
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
 */
export function workspaceSections(open?: OpenWorkspace): SidebarSection[] {
  const isNew =
    open !== undefined &&
    !workspaceList.some((item) => item.key === open.workspace.key)
  const all = isNew ? [open.workspace, ...workspaceList] : workspaceList
  return sectionKeys.map((key) => ({
    section: sections[key],
    rows: all
      .filter((workspace) => workspace.section === key)
      .map((workspace) => rowFor(workspace, open)),
  }))
}

/** A new org: its default section, with no workspaces yet. */
export function newOrgSections(): SidebarSection[] {
  return [{ section: sections[defaultSection], rows: [] }]
}

/**
 * The sections after the open workspace was archived. It leaves its section
 * for the open Archived group.
 */
export function archivedSections(open: Workspace): {
  sections: SidebarSection[]
  archived: WorkspaceRow[]
} {
  const list = sectionKeys.map((key) => ({
    section: sections[key],
    rows: workspaceList
      .filter((item) => item.section === key && item.key !== open.key)
      .map((item) => rowFor(item)),
  }))
  const archived: WorkspaceRow = {
    workspace: open,
    status: 'archived',
    selected: true,
  }
  return { sections: list, archived: [archived] }
}
