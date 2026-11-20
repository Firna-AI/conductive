import type { WorkspaceView } from '../../shared/workspace-view'
import type { ChatSnapshot } from './chat-snapshot'

/** Changes a known view. An unread view stays unknown. */
export function withView(
  snapshot: ChatSnapshot,
  change: (view: WorkspaceView) => WorkspaceView,
): ChatSnapshot {
  if (snapshot.view === null) return snapshot
  const view = change(snapshot.view)
  return view === snapshot.view ? snapshot : { ...snapshot, view }
}

/**
 * Saves the current known view one request at a time. A newer view replaces
 * one that waits. An unread view sends nothing.
 */
export function viewWriter(
  read: () => WorkspaceView | null,
  save: (view: WorkspaceView) => Promise<unknown>,
): () => void {
  let waiting: WorkspaceView | null = null
  let writing = false
  const flush = async () => {
    if (writing || waiting === null) return
    const view = waiting
    waiting = null
    if (read() === null) return
    writing = true
    try {
      await save(view)
    } catch {
      // The next change sends the whole view again.
    } finally {
      writing = false
      void flush()
    }
  }
  return () => {
    waiting = read()
    void flush()
  }
}
