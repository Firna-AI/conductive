import { useSyncExternalStore } from 'react'
import type { RunRoutine } from '../../chat/api/read-responses'
import type { WorkspaceView } from '../../shared/workspace-view'
import type { SavedView } from './features'

/**
 * The chat loaded and read the saved view, so a change keeps the saved
 * tabs. A load that runs or failed, or a view that did not read, leaves
 * the saved tabs unknown, and the shell then writes nothing.
 */
function viewKnown(saved: SavedView): boolean {
  const { load, view } = saved.getSnapshot()
  return load.state === 'ready' && view !== null
}

/** Whether the chat loaded and read the saved view. */
export function useViewKnown(saved: SavedView): boolean {
  const read = () => viewKnown(saved)
  return useSyncExternalStore(saved.subscribe, read, read)
}

/** The saved view, or null until the chat reads it. */
export function useSavedView(saved: SavedView): WorkspaceView | null {
  const read = () => saved.getSnapshot().view
  return useSyncExternalStore(saved.subscribe, read, read)
}

/**
 * Saves a change of the view through the one writer of the chat, once the
 * view is known. While it is unknown, the address alone moves, and the part
 * that shows saves its state once the view is known.
 */
export function saveView(
  saved: SavedView,
  change: (view: WorkspaceView) => WorkspaceView,
): void {
  if (viewKnown(saved)) saved.updateView(change)
}

/**
 * The routine whose run made the workspace, which the chat reads with the
 * view. Null for a workspace that a person created, and until the read.
 */
export function useRunRoutine(saved: SavedView): RunRoutine | null {
  const read = () => saved.getSnapshot().routine
  return useSyncExternalStore(saved.subscribe, read, read)
}
