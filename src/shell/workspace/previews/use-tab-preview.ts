import { useEffect, useMemo, useRef, useState } from 'react'
import type { Preview } from '../../../shared/generated/Preview'
import { openPreview } from '../../../previews/previewsApi'
import { previewOfPort, visiblePreviews } from '../../../previews/previewsState'
import type { ToolError } from '../../../terminal/tool-parts/request'
import type { ToolRequests } from '../../../terminal/tool-parts/workspace'
import { useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { useTabVisits } from '../tab-visits'
import { usePreviewsState } from './kept-previews'

/** The preview of the shown Preview tab, and how it opens. */
export interface TabPreview {
  /** The open preview of the port, its oldest one, or null. */
  preview: Preview | null
  /** An open of the port runs. */
  opening: boolean
  /** The open of this show failed, or null. */
  error: ToolError | null
  /** Asks for a new open after a failure, as Reload and Try again do. */
  retry: () => void
}

/**
 * The preview of the Preview tab of `port`, while that tab shows. When the
 * port has no open preview, the hook opens one with the request of a typed
 * port, with no notice (decision 292). This holds at each show of the tab:
 * a click on the tab or on its port, a visit to its address, or a return of
 * the sandbox. It waits while the sandbox does not run, while the list
 * loads, and while an open runs. After a failed open, it asks again only
 * at the next visit that shows the tab, as `useTabVisits` says, or at
 * `retry`, so a refused port sends no loop of requests.
 */
export function useTabPreview(
  context: WorkspaceContext,
  port: number | null,
): TabPreview {
  const { store, state } = usePreviewsState(context)
  const fetch = useOrgServices(context.org.id).api.fetch
  const { org, workspace } = context
  const requests = useMemo<ToolRequests>(
    () => ({ orgId: org.id, workspaceId: workspace.id, fetch }),
    [org.id, workspace.id, fetch],
  )
  const [failed, setFailed] = useState<{
    port: number
    error: ToolError
  } | null>(null)
  // Another tab, or no tab, ends the failure of the last show. So does each
  // visit that shows the tab again, such as a click on the tab or its port.
  const [lastPort, setLastPort] = useState(port)
  if (port !== lastPort) {
    setLastPort(port)
    setFailed(null)
  }
  useTabVisits(context, (tab) => {
    if (port !== null && tab === `preview:${port}`) setFailed(null)
  })
  /** The port whose open runs, so a second run of the effect sends none. */
  const asking = useRef<number | null>(null)
  const preview =
    port === null ? null : previewOfPort(visiblePreviews(state), port)
  const ready =
    context.sandbox === 'ready' && state.load === null && !state.opening
  const error = failed !== null && failed.port === port ? failed.error : null

  useEffect(() => {
    if (port === null || preview !== null || !ready || error !== null) return
    if (asking.current === port) return
    asking.current = port
    store.dispatch({ type: 'open' })
    void openPreview(requests, port).then((result) => {
      if (asking.current === port) asking.current = null
      if (result.ok) {
        store.dispatch({ type: 'opened', preview: result.value })
        return
      }
      store.dispatch({ type: 'open-failed', error: result.error })
      setFailed({ port, error: result.error })
    })
  }, [port, preview, ready, error, store, requests])

  return {
    preview,
    opening: state.opening,
    error,
    retry: () => setFailed(null),
  }
}
