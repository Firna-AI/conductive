import type { Workspace } from '../shared/generated/Workspace'
import type { Section } from '../shared/sections'
import type { WorkspacesResponse } from '../shared/workspaces'

import { replaceWorkspace } from './list-trees'
import type { Change } from './resource'
import {
  moveWorkspace,
  ordered,
  reorderSections,
  withoutSection,
} from './sections'

/** The list of an org: its sections, and its workspaces in their order. */
export interface ListData extends WorkspacesResponse {
  sections: readonly Section[]
}

export type ListChange = Change<ListData>

/**
 * A newer record of a workspace, such as from an event, an open, or
 * Archive. A workspace that the list has keeps its place: its parent,
 * section, and order change only through a read of the list, a move, or the
 * Archive of a workspace above it, as `replaceWorkspace` says. The
 * record of a workspace can be older than a move, so its placement does
 * not count. A listed row also keeps its GitHub summary, which only a list
 * read replaces on the same branch. A branch change takes the new branch's
 * summary. A new workspace goes to the top with its initial summary. An
 * open pull request bar shows its own state over the summary, as
 * `LiveGitHubStates` says. Only the list read carries the merge queue
 * entry, the access of the viewer, and the GitHub base, so a listed row
 * keeps them on the same branch.
 */
export function workspaceUpdated(workspace: Workspace): ListChange {
  return (list) => {
    if (!list.workspaces.some((item) => item.id === workspace.id)) {
      return { ...list, workspaces: [workspace, ...list.workspaces] }
    }
    return {
      ...list,
      workspaces: replaceWorkspace(list.workspaces, workspace.id, (item) => ({
        ...workspace,
        ...(item.branch === workspace.branch && listedFields(item)),
        parentId: item.parentId,
        sectionId: item.sectionId,
        github:
          item.branch === workspace.branch ? item.github : workspace.github,
        ...waitingOf(item, workspace),
      })),
    }
  }
}

/**
 * Whether a message waits for the start. Only the list read carries it, so
 * a listed row keeps it while the row and the newer record both start. A
 * value from an earlier start never moves the mark of a later start.
 */
function waitingOf(
  item: Workspace,
  workspace: Workspace,
): Pick<Workspace, 'messageWaiting'> {
  if (workspace.messageWaiting !== undefined)
    return { messageWaiting: workspace.messageWaiting }
  const keeps =
    item.state === 'starting' &&
    workspace.state === 'starting' &&
    item.messageWaiting !== undefined
  return keeps ? { messageWaiting: item.messageWaiting } : {}
}

/** The fields that only the list read carries, which a listed row keeps. */
function listedFields(
  workspace: Workspace,
): Pick<
  Workspace,
  | 'mergeQueue'
  | 'mergeQueueLabels'
  | 'githubCanWrite'
  | 'githubPullBase'
  | 'githubPullFromFork'
> {
  const {
    mergeQueue,
    mergeQueueLabels,
    githubCanWrite,
    githubPullBase,
    githubPullFromFork,
  } = workspace
  return {
    ...(mergeQueue !== undefined && { mergeQueue }),
    ...(mergeQueueLabels !== undefined && { mergeQueueLabels }),
    ...(githubCanWrite !== undefined && { githubCanWrite }),
    ...(githubPullBase !== undefined && { githubPullBase }),
    ...(githubPullFromFork !== undefined && { githubPullFromFork }),
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

/** A read mark clears unread output without changing another listed state. */
export function workspaceRead(workspaceId: string): ListChange {
  return (list) => ({
    ...list,
    workspaces: list.workspaces.map((item) =>
      item.id === workspaceId && item.state === 'unread'
        ? { ...item, state: 'ready' }
        : item,
    ),
  })
}

export function workspaceReassigned(
  workspaceId: string,
  owner: Workspace['owner'],
): ListChange {
  return workspaceChanged(workspaceId, { owner })
}

/**
 * A confirmed Archive or Restore changes only its own fields, so a newer
 * name, owner, or section stays. Its fields include the state of the cloud
 * computer, which a reply without it clears. Each one raises `updatedAt`, so
 * it changes nothing over a record that is not older, such as a later
 * Restore that a read brought. An Archive also gives its place to the rows
 * under it, as `replaceWorkspace` says.
 */
export function workspaceLifecycle(workspace: Workspace): ListChange {
  const { state, archivedAt, restoreUntil, archivedComputer, updatedAt } =
    workspace
  return (list) => ({
    ...list,
    workspaces: replaceWorkspace(list.workspaces, workspace.id, (current) =>
      current.updatedAt < updatedAt
        ? {
            ...current,
            state,
            archivedAt,
            restoreUntil,
            archivedComputer,
            updatedAt,
          }
        : current,
    ),
  })
}

/**
 * A new section directly below `afterSectionId`, or at the end without it
 * or when that section is gone. A read that has it already keeps its own.
 */
export function sectionAdded(
  section: Section,
  afterSectionId?: string,
): ListChange {
  return (list) => {
    if (list.sections.some((item) => item.id === section.id)) return list
    const sections = [...list.sections, section]
    const below = ordered(list.sections).findIndex(
      (item) => item.id === afterSectionId,
    )
    return below === -1
      ? { ...list, sections }
      : { ...list, sections: reorderSections(sections, section.id, below + 1) }
  }
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

/**
 * A move of a section to `index` of the list, which counts the sections
 * without the moved one. It applies to the list as it is then.
 */
export function sectionMoved(sectionId: string, index: number): ListChange {
  return (list) => ({
    ...list,
    sections: reorderSections(list.sections, sectionId, index),
  })
}

/** Deleting a section moves its workspaces to General. */
export function sectionDeleted(sectionId: string): ListChange {
  return (list) => ({
    ...list,
    ...withoutSection(list.sections, list.workspaces, sectionId),
  })
}

/**
 * A move of the tree of a top-level row to `index` of a section, which
 * counts the top-level rows of that section without the moved one. It
 * applies to the list as it is then, so a move stays right over a newer
 * read.
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
