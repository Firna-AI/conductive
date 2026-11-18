import type { Workspace } from '../../shared/generated/Workspace'
import type { WorkspaceStart } from '../../shared/generated/WorkspaceStart'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import type { OrderedWorkspaceResponse } from '../../shared/workspaces'
import { afterRestore, isArchived } from './archive-view'
import type { ChatSnapshot } from './chat-snapshot'
import type { ChatContext } from './context'

/**
 * The view without its file and diff tabs, after a repository change: their
 * paths belong to the folder of the old repository. A file or diff that
 * showed gives its place to the session of the chat.
 */
function withoutFileTabs(snapshot: ChatSnapshot): WorkspaceView | null {
  const { view, activeSessionId } = snapshot
  if (!view) return view
  const tabs = view.tabs.filter((tab) => tab.kind === 'session')
  const active = view.activeTab
  const showsFile = active !== null && active.kind !== 'session'
  if (tabs.length === view.tabs.length && !showsFile && !view.temporaryTab)
    return view
  const session: WorkspaceTab | null = activeSessionId
    ? { kind: 'session', sessionId: activeSessionId }
    : null
  return {
    ...view,
    tabs,
    activeTab: showsFile ? session : active,
    temporaryTab: null,
  }
}

/**
 * The snapshot with a newer workspace record. A record that leaves the
 * archived state ends the read-only tabs, as `afterRestore` says. A record
 * of another repository closes the file and diff tabs, and clears the
 * folder of the old repository until `afterRepositoryMove` reads the new
 * one.
 */
function withRecord(
  snapshot: ChatSnapshot,
  workspace: Workspace,
): ChatSnapshot {
  const restored = isArchived(snapshot) && workspace.state !== 'archived'
  const moved =
    snapshot.workspace !== null &&
    snapshot.workspace.repositoryId !== workspace.repositoryId
  const next = moved
    ? {
        ...snapshot,
        workspace,
        view: withoutFileTabs(snapshot),
        repositoryFolder: null,
      }
    : { ...snapshot, workspace }
  return restored ? afterRestore(next) : next
}

/**
 * Reads the folder of the new repository after a repository change, so the
 * file chips of the chat use it. Only the read of the view gives the
 * folder. The chat drops a reply that comes after a later change, because
 * that change reads again. After a failed read, the chat has no folder
 * until the next change or load.
 */
async function reloadRepositoryFolder(
  context: ChatContext,
  repositoryId: string,
): Promise<void> {
  const reply = await context.api.view().catch(() => null)
  if (!context.live() || reply === null) return
  context.store.update((snapshot) =>
    snapshot.workspace?.repositoryId === repositoryId
      ? {
          ...snapshot,
          repositoryFolder: reply.repositoryFolder,
          heldRepositoryIds: reply.heldRepositoryIds,
        }
      : snapshot,
  )
}

/**
 * After a record of another repository: saves the view whose file and diff
 * tabs closed, so each later tab of the member opens without them, and
 * reads the folder of the new repository.
 */
export function afterRepositoryMove(
  context: ChatContext,
  before: ChatSnapshot,
): void {
  const after = context.store.get()
  if (
    before.workspace === null ||
    after.workspace === null ||
    before.workspace.repositoryId === after.workspace.repositoryId
  )
    return
  if (after.view && after.view !== before.view) context.saveView(after.view)
  void reloadRepositoryFolder(context, after.workspace.repositoryId)
}

/**
 * Shows the workspace record, its start steps, and its saved error of a
 * read or a reply when no newer state of them has shown, and says whether
 * they showed.
 */
export function confirmWorkspace(
  context: ChatContext,
  reply: Pick<
    OrderedWorkspaceResponse,
    'workspace' | 'start' | 'error' | 'eventNumber'
  >,
): boolean {
  if (!context.live()) return false
  const newer = reply.eventNumber >= context.workspaceOrder.through
  if (!newer) return false
  context.workspaceOrder.through = reply.eventNumber
  const before = context.store.get()
  context.store.update((snapshot) => ({
    ...withRecord(snapshot, reply.workspace),
    start: reply.start,
    savedError: reply.error?.message ?? null,
  }))
  afterRepositoryMove(context, before)
  return true
}

/**
 * A change of the workspace record from the stream, at its number. An
 * update without `error` keeps the saved error, and null clears it.
 */
type WorkspaceChange =
  | {
      type: 'workspace.updated'
      workspace: Workspace
      error?: { message: string } | null
    }
  | { type: 'workspace.title'; name: string }
  | { type: 'start.updated'; start: WorkspaceStart }

/**
 * The snapshot after a change of the workspace record from the stream. A
 * change that is not newer than the record that shows changes nothing.
 */
export function withWorkspaceChange(
  context: ChatContext,
  snapshot: ChatSnapshot,
  change: WorkspaceChange,
  eventNumber: number,
): ChatSnapshot {
  if (eventNumber <= context.workspaceOrder.through) return snapshot
  context.workspaceOrder.through = eventNumber
  switch (change.type) {
    case 'workspace.updated':
      return {
        ...withRecord(snapshot, change.workspace),
        savedError:
          change.error === undefined
            ? snapshot.savedError
            : (change.error?.message ?? null),
      }
    case 'start.updated':
      return { ...snapshot, start: change.start }
    case 'workspace.title':
      return snapshot.workspace
        ? {
            ...snapshot,
            workspace: { ...snapshot.workspace, name: change.name },
          }
        : snapshot
  }
}
