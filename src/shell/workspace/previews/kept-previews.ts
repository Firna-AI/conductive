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
  const runs = context.sandbox === 'ready'
  useEffect(() => {
    if (!runs) return undefined
    return connectPreviews(store, { fetch, subscribe })
  }, [store, fetch, subscribe, runs])
}

/**
 * Connects the kept previews, and reads the list again when an earlier
 * connection read it. No event announces a preview that opened while the
 * store was not connected, such as one that an agent opened while another
 * workspace showed. So the list of an earlier connection can miss it. The
 * read shows as loading, so no Preview tab opens a second preview of a
 * port before the list is current.
 */
export function connectPreviews(
  store: PreviewsStore,
  source: Parameters<PreviewsStore['connect']>[0],
): () => void {
  if (store.getSnapshot().load === null) store.dispatch({ type: 'load' })
  return store.connect(source)
}
