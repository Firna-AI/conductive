import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useServices } from '../../../app/services'
import type {
  FilesPreviewState,
  FilesPreviewStore,
} from '../../../previews/filesPreview'
import { useApp, useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { shownWorkspaces } from '../tab-memory'

/**
 * The kept files preview of the open workspace, which the tabs of HTML
 * files read. It connects nothing: `useFilesPreviewConnection` of the
 * screen connects it.
 */
function useKeptFilesPreview(context: WorkspaceContext): FilesPreviewStore {
  const app = useApp()
  const { viewer, org, workspace } = context
  return useMemo(
    () => shownWorkspaces(app, viewer).filesPreview(org.id, workspace.id),
    [app, viewer, org.id, workspace.id],
  )
}

/** The kept files preview of the open workspace, and its snapshot. */
export function useFilesPreviewState(context: WorkspaceContext): {
  store: FilesPreviewStore
  state: FilesPreviewState
} {
  const store = useKeptFilesPreview(context)
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
  return { store, state }
}

/**
 * The one connection of the kept files preview, for the whole screen. It
 * takes the events of the tools while the screen shows the workspace, also
 * while the sandbox does not run, so a revoke ends the files preview. The
 * kept revokes come first at each connect. The files preview also ends at
 * its expiry, by the clock of the app, and when the cloud computer stops:
 * while the sandbox is stopped, failed, or archived. A Restart shows
 * Starting and stops no cloud computer, so it ends nothing. The end of the
 * connection forgets the files preview, as `connectFilesPreview` says.
 */
export function useFilesPreviewConnection(context: WorkspaceContext): void {
  const { store, state } = useFilesPreviewState(context)
  const fetch = useOrgServices(context.org.id).api.fetch
  const { now, delay } = useServices()
  const subscribe = context.toolEvents
  const archived = context.sandbox === 'archived'
  const stopped =
    archived || context.sandbox === 'stopped' || context.sandbox === 'error'
  useEffect(() => {
    if (archived) return undefined
    return connectFilesPreview(store, { fetch, subscribe })
  }, [store, fetch, subscribe, archived])
  const { preview } = state
  useEffect(() => {
    if (preview === null) return undefined
    const end = () => store.dispatch({ type: 'ended', previewId: preview.id })
    if (stopped) {
      end()
      return undefined
    }
    return delay(Math.max(0, preview.expiresAt - now()), end)
  }, [store, preview, stopped, now, delay])
}

/**
 * Connects the kept files preview. When the connection ends, the app no
 * longer knows whether the files preview lives: it can expire, or end by a
 * revoke or a stop, while no screen watches it. So the end forgets it and
 * ends the open that runs, as `connectPreviews` marks the list of the port
 * previews for a new read. The first show after a return then opens again,
 * and the route answers the files preview that lives, or a new one.
 */
function connectFilesPreview(
  store: FilesPreviewStore,
  source: Parameters<FilesPreviewStore['connect']>[0],
): () => void {
  const stop = store.connect(source)
  return () => {
    stop()
    store.dispatch({ type: 'disconnected' })
  }
}
