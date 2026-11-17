import type { Workspace } from '../../shared/generated/Workspace'
import {
  WORKSPACE_RESTORE_MS,
  type WorkspaceResponse,
} from '../../shared/workspaces'
import { placeWorkspaces } from '../../shared/workspace-tree'
import { count, record, text } from '../api/parse'
import { failedFirstStart } from '../first-start'
import { moveWorkspace } from '../sections'
import {
  changeWorkspace,
  requireSection,
  requireWorkspace,
  workspaceDetail,
  type DevBackend,
} from './backend'
import { json, optional, requiredText, RouteError } from './router'
import { cancelStart } from './start-steps'
import type { OrgState } from './state'

// The writes of one workspace of the dev fake: Rename, the move of its
// tree, Archive, and Restore, as the Worker does them.

/**
 * The time of a change, which keeps the time of the last change as its
 * minimum, as the Worker does. Archive and Restore raise it also on the
 * same tick of the clock, so the app can order them.
 */
function changedAt(
  backend: DevBackend,
  workspace: Workspace,
  raise = false,
): number {
  return Math.max(backend.now(), workspace.updatedAt + (raise ? 1 : 0))
}

function detailReply(org: OrgState, workspaceId: string): Response {
  return json(workspaceDetail(org, workspaceId) satisfies WorkspaceResponse)
}

/**
 * The move of the tree of a top-level row, as the Worker writes it: each
 * workspace under the row takes its section, with the time of the change,
 * and goes to the open tabs.
 */
function moveTree(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  target: { sectionId: string; index: number },
): void {
  const before = new Map(org.workspaces.map((item) => [item.id, item]))
  org.workspaces = moveWorkspace(
    org.workspaces,
    org.sections,
    workspaceId,
    target.sectionId,
    target.index,
  )
  for (const workspace of org.workspaces) {
    const was = before.get(workspace.id)
    if (workspace.id === workspaceId || was?.sectionId === workspace.sectionId)
      continue
    changeWorkspace(backend, org, {
      ...workspace,
      updatedAt: changedAt(backend, workspace),
    })
  }
}

/**
 * Rename, and the move of a drag. `position` is the index in the target
 * section among its top-level rows, without the moved one, and the list
 * order follows it. A move takes the tree of the row with it. A nested row
 * moves only with its tree, so its move changes nothing, as the Worker
 * does, and a rename of it changes only the name.
 */
export function updateWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
  body: unknown,
): Response {
  const current = requireWorkspace(org, workspaceId)
  if (current.archivedAt !== null || current.state === 'archived') {
    throw new RouteError(
      409,
      'workspace_archived',
      'The archived chat is read-only.',
    )
  }
  const fields = record(body)
  const name = optional(fields, 'name', requiredText)
  const sectionId = optional(fields, 'sectionId', text)
  const position = optional(fields, 'position', count)
  if (sectionId !== undefined) requireSection(org, sectionId)
  const nested = placeWorkspaces(org.workspaces, org.sections).some(
    (row) => row.workspace.id === workspaceId && row.parentId !== null,
  )
  if (nested && name === undefined) return detailReply(org, workspaceId)
  if (sectionId !== undefined || position !== undefined) {
    moveTree(backend, org, workspaceId, {
      sectionId: sectionId ?? current.sectionId,
      index: position ?? 0,
    })
  }
  const moved = requireWorkspace(org, workspaceId)
  changeWorkspace(backend, org, {
    ...moved,
    name: name ?? moved.name,
    updatedAt: changedAt(backend, moved),
  })
  return detailReply(org, workspaceId)
}

/**
 * Archive stops the cloud computer at once, with no check, and keeps it for
 * the 14 days of Restore. A failed first start has no cloud computer to
 * keep. A repeat changes nothing. The chat stays read-only.
 */
export function archiveWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
): Response {
  const current = requireWorkspace(org, workspaceId)
  if (current.state !== 'archived') {
    const saved = org.starts.get(workspaceId)?.start ?? null
    const first = failedFirstStart(current, saved)
    cancelStart(org, workspaceId)
    org.starts.set(workspaceId, { start: null, error: null })
    const at = backend.now()
    changeWorkspace(backend, org, {
      ...current,
      state: 'archived',
      archivedAt: at,
      restoreUntil: first ? null : at + WORKSPACE_RESTORE_MS,
      updatedAt: changedAt(backend, current, true),
    })
  }
  return detailReply(org, workspaceId)
}

/**
 * Restore puts an archived workspace back in its section, stopped, and
 * starts nothing. A repeat changes nothing. After the last day of Restore,
 * or without a kept cloud computer, it refuses, as the Worker does.
 */
export function restoreWorkspace(
  backend: DevBackend,
  org: OrgState,
  workspaceId: string,
): Response {
  const current = requireWorkspace(org, workspaceId)
  if (current.state === 'archived') {
    const { restoreUntil } = current
    if (restoreUntil === null || backend.now() >= restoreUntil) {
      throw new RouteError(
        409,
        'workspace_restore_unavailable',
        restoreUntil === null
          ? 'No cloud computer is available to restore.'
          : 'The time to restore this workspace has ended.',
      )
    }
    changeWorkspace(backend, org, {
      ...current,
      state: 'stopped',
      archivedAt: null,
      restoreUntil: null,
      updatedAt: changedAt(backend, current, true),
    })
  }
  return detailReply(org, workspaceId)
}
