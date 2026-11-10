import type { Section } from '../shared/sections'
import type { Workspace } from '../shared/workspaces'
import type { Change } from './resource'
import { moveWorkspace, withoutSection } from './sections'

/** The list of an org: its sections, and its workspaces in their order. */
export interface ListData {
  sections: readonly Section[]
  workspaces: readonly Workspace[]
}

export type ListChange = Change<ListData>

/**
 * A newer record of a workspace, such as from an event, an open, or
 * Archive. A workspace that the list has keeps its place: its section and
 * its order change only through a read of the list or a move. The
 * record of a workspace can be older than a move, so its section does not
 * count. A new workspace goes to the top.
 */
export function workspaceUpdated(workspace: Workspace): ListChange {
  return (list) => {
    if (!list.workspaces.some((item) => item.id === workspace.id)) {
      return { ...list, workspaces: [workspace, ...list.workspaces] }
    }
    return {
      ...list,
      workspaces: list.workspaces.map((item) =>
        item.id === workspace.id
          ? { ...workspace, sectionId: item.sectionId }
          : item,
      ),
    }
  }
}

/** A confirmed row action keeps every field that its reply does not own. */
function workspaceChanged(
  workspaceId: string,
  fields: Partial<Pick<Workspace, 'name' | 'owner' | 'state' | 'archivedAt'>>,
): ListChange {
  return (list) => ({
    ...list,
    workspaces: list.workspaces.map((item) =>
      item.id === workspaceId ? { ...item, ...fields } : item,
    ),
  })
}

export function workspaceRenamed(
  workspaceId: string,
  name: string | null,
): ListChange {
  return workspaceChanged(workspaceId, { name })
}

export function workspaceReassigned(
  workspaceId: string,
  owner: Workspace['owner'],
): ListChange {
  return workspaceChanged(workspaceId, { owner })
}

export function workspaceArchived(workspace: Workspace): ListChange {
  return (list) => ({
    ...list,
    workspaces: list.workspaces.map((current) =>
      current.id === workspace.id
        ? {
            ...current,
            state: workspace.state,
            archivedAt: workspace.archivedAt,
            updatedAt: Math.max(current.updatedAt, workspace.updatedAt),
          }
        : current,
    ),
  })
}

/** A new section at the end. A read that has it already keeps its own. */
export function sectionAdded(section: Section): ListChange {
  return (list) =>
    list.sections.some((item) => item.id === section.id)
      ? list
      : { ...list, sections: [...list.sections, section] }
}

function sectionChanged(
  sectionId: string,
  fields: Partial<Pick<Section, 'name' | 'collapsed'>>,
): ListChange {
  return (list) => ({
    ...list,
    sections: list.sections.map((item) =>
      item.id === sectionId ? { ...item, ...fields } : item,
    ),
  })
}

export function sectionRenamed(sectionId: string, name: string): ListChange {
  return sectionChanged(sectionId, { name })
}

export function sectionCollapsed(
  sectionId: string,
  collapsed: boolean,
): ListChange {
  return sectionChanged(sectionId, { collapsed })
}

/** Deleting a section moves its workspaces to General. */
export function sectionDeleted(sectionId: string): ListChange {
  return (list) => withoutSection(list.sections, list.workspaces, sectionId)
}

/**
 * A move to `index` of a section, which counts the workspaces of that
 * section without the moved one. It applies to the list as it is then, so
 * a move stays right over a newer read.
 */
export function workspaceMoved(
  workspaceId: string,
  sectionId: string,
  index: number,
): ListChange {
  return (list) => ({
    ...list,
    workspaces: moveWorkspace(
      list.workspaces,
      list.sections,
      workspaceId,
      sectionId,
      index,
    ),
  })
}
