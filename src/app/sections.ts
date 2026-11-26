import type { Workspace } from '../shared/generated/Workspace'
import type { Section } from '../shared/sections'
import { placeWorkspaces } from '../shared/workspace-tree'
import { topLevelRows, workspacesUnder, type ListRow } from './list-trees'
import { isQueued } from './merge-queue'
import { listedWorkspaces } from './workspace-removal'

export interface SectionGroup {
  section: Section
  /**
   * The rows of the section in tree order: each top-level row, then the
   * rows nested under it, oldest first, each followed by its own.
   */
  rows: readonly ListRow[]
}

export interface WorkspaceGroups {
  sections: readonly SectionGroup[]
  /**
   * The queued workspaces, which show only in the Merge queue group at the
   * top of the list (decision 318). `queueBlocks` orders them.
   */
  queued: readonly Workspace[]
  /** The Archived group at the end of the list, the last archived first. */
  archived: readonly Workspace[]
}

/** The default section, General, where new workspaces go. */
export function defaultSection(
  sections: readonly Section[],
): Section | undefined {
  return sections.find((section) => section.isDefault) ?? sections[0]
}

/** The sections in the order of the list. */
export function ordered(sections: readonly Section[]): Section[] {
  return [...sections].sort((a, b) => a.position - b.position)
}

/**
 * The sections of the list at `now`, each with its rows as
 * `placeWorkspaces`, the shared rule of the app and the Worker, places
 * them: each top-level row in the order of the workspace list, and each
 * live sub-workspace under the row of its parent, or of the nearest live
 * workspace above it while its parent is archived or queued. An unknown
 * section falls back to General. Archived workspaces leave their sections
 * for the flat Archived group, and queued ones for the Merge queue group.
 * A removed workspace, whose Restore ended by `now`,
 * shows in neither, as `isListed` says. It is archived, so it has no row,
 * but its live sub-workspaces still show under the nearest live workspace
 * above it, as the Worker places them. This is the one place that leaves
 * it out of the list, its counts, its keys, and the groups of the palette.
 */
export function groupWorkspaces(
  sections: readonly Section[],
  workspaces: readonly Workspace[],
  now: number,
): WorkspaceGroups {
  const rows = placeWorkspaces(workspaces, sections)
  const listed = listedWorkspaces(workspaces, now)
  return {
    sections: ordered(sections).map((section) => ({
      section,
      rows: rows.filter((row) => row.sectionId === section.id),
    })),
    queued: listed.filter(isQueued),
    archived: listed
      .filter((workspace) => workspace.state === 'archived')
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)),
  }
}

/**
 * The list after a move puts the tree of a top-level row at `index` of a
 * section, as a drop does. The index counts the top-level rows of that
 * section without the moved one. Each workspace under the row, live or
 * archived, takes the section too, as the Worker writes it. Every other
 * workspace keeps its place. A nested row moves only with its tree, so a
 * move of it changes nothing, and neither does a move of an archived or a
 * queued workspace.
 */
export function moveWorkspace(
  workspaces: readonly Workspace[],
  sections: readonly Section[],
  workspaceId: string,
  sectionId: string,
  index: number,
): Workspace[] {
  const rows = placeWorkspaces(workspaces, sections)
  const moved = rows.find((row) => row.workspace.id === workspaceId)
  if (!moved || moved.parentId !== null) return [...workspaces]
  const tree = workspacesUnder(workspaces, workspaceId)
  const rest = workspaces.flatMap((workspace) => {
    if (workspace.id === workspaceId) return []
    return [tree.has(workspace.id) ? { ...workspace, sectionId } : workspace]
  })
  const target = topLevelRows(rows).filter(
    (row) => row.sectionId === sectionId && row.workspace.id !== workspaceId,
  )
  const placed = { ...moved.workspace, sectionId }
  const placeOf = (row: ListRow) =>
    rest.findIndex((workspace) => workspace.id === row.workspace.id)
  const before = target[Math.max(0, index)]
  if (before) {
    const at = placeOf(before)
    return [...rest.slice(0, at), placed, ...rest.slice(at)]
  }
  const last = target.at(-1)
  if (!last) return [placed, ...rest]
  const at = placeOf(last) + 1
  return [...rest.slice(0, at), placed, ...rest.slice(at)]
}

/**
 * The sections after a move puts one at `index` of the list. The index
 * counts the sections without the moved one. Each section then takes its
 * place as its position, as the server numbers them.
 */
export function reorderSections(
  sections: readonly Section[],
  sectionId: string,
  index: number,
): Section[] {
  const list = ordered(sections)
  const moved = list.find((section) => section.id === sectionId)
  if (!moved) return list
  const rest = list.filter((section) => section !== moved)
  const at = Math.min(Math.max(0, index), rest.length)
  return [...rest.slice(0, at), moved, ...rest.slice(at)].map(
    (section, position) => ({ ...section, position }),
  )
}

/** Deleting a section moves its workspaces to General, so nothing is lost. */
export function withoutSection(
  sections: readonly Section[],
  workspaces: readonly Workspace[],
  sectionId: string,
): { sections: Section[]; workspaces: Workspace[] } {
  const left = sections.filter((section) => section.id !== sectionId)
  const general = defaultSection(left)
  return {
    sections: left,
    workspaces: workspaces.map((workspace) =>
      workspace.sectionId === sectionId && general
        ? { ...workspace, sectionId: general.id }
        : workspace,
    ),
  }
}

/**
 * The place one step up or down from a top-level row, for the keys that
 * move a row: past the tree above or below it. The index counts the
 * top-level rows of the section without the moved one. A step past the end
 * of a section goes to the next open section. A nested row moves only with
 * its tree, so it has no step.
 */
export function stepTarget(
  groups: readonly SectionGroup[],
  workspaceId: string,
  step: 1 | -1,
): { sectionId: string; index: number } | null {
  const at = groups.findIndex((group) =>
    group.rows.some((row) => row.workspace.id === workspaceId),
  )
  const group = groups[at]
  if (!group) return null
  const places = topLevelRows(group.rows)
  const index = places.findIndex((row) => row.workspace.id === workspaceId)
  if (index < 0) return null
  const next = index + step
  if (next >= 0 && next < places.length) {
    return { sectionId: group.section.id, index: next }
  }
  const open = (candidate: SectionGroup | undefined) =>
    candidate !== undefined && !candidate.section.collapsed
  for (
    let other = at + step;
    other >= 0 && other < groups.length;
    other += step
  ) {
    const neighbour = groups[other]
    if (!open(neighbour)) continue
    return {
      sectionId: neighbour.section.id,
      index: step === 1 ? 0 : topLevelRows(neighbour.rows).length,
    }
  }
  return null
}
