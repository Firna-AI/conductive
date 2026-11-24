import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { PreviewsState } from '../../../previews/previewsState'
import type { PreviewsStore } from '../../../previews/previewsStore'
import { useApp, useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { shownWorkspaces } from '../tab-memory'

/**
 * The kept previews of the open workspace: one store for each shown
 * workspace, which the Preview tool and the Preview tabs read. It connects
 * nothing: `usePreviewsConnection` of the screen connects it.
 */
export function useKeptPreviews(context: WorkspaceContext): PreviewsStore {
  const app = useApp()
  const { viewer, org, workspace } = context
  return useMemo(
    () => shownWorkspaces(app, viewer).previews(org.id, workspace.id),
    [app, viewer, org.id, workspace.id],
  )
}

/** The snapshot of the kept previews of the open workspace. */
export function usePreviewsState(context: WorkspaceContext): {
  store: PreviewsStore
  state: PreviewsState
} {
  const store = useKeptPreviews(context)
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
  return { store, state }
}

/**
 * The one connection of the kept previews, for the whole screen. It runs
 * while the sandbox runs, as the Preview tool used to connect only then: a
 * stop revokes every preview, and the next start reads the list again. It
 * reads through the client of the org, and takes the events of the tools.
 */
export function usePreviewsConnection(context: WorkspaceContext): void {
  const store = useKeptPreviews(context)
  const fetch = useOrgServices(context.org.id).api.fetch
  const subscribe = context.toolEvents
  const { seeded } = context.stream
  const runs = context.sandbox === 'ready'
  useEffect(() => {
    if (!runs) return undefined
    return connectPreviews(store, { fetch, subscribe, seeded })
  }, [store, fetch, subscribe, seeded, runs])
}

/**
 * Connects the kept previews. When the connection ends, the list is no
 * longer current: no event announces a preview that opens while the store
 * is not connected, such as one that an agent opens while another
 * workspace shows. So the end marks the list as loading at once, before a
 * Preview tab of a later show can take the old list as current, and the
 * next connection reads it again. No Preview tab opens a second preview of
 * a port while the list loads.
 */
export function connectPreviews(
  store: PreviewsStore,
  source: Parameters<PreviewsStore['connect']>[0],
): () => void {
  const stop = store.connect(source)
  return () => {
    stop()
    store.dispatch({ type: 'load' })
  }
}
