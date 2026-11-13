import { useEffect, useRef, useState } from 'react'
import type { Preview } from '../shared/previews'
import type { ToolRequests } from '../terminal/tool-parts/workspace'
import { useAddressPort } from './addressPort'
import type { PreviewRoute } from './PreviewTool'
import { closePreview, openPreview } from './previewsApi'
import {
  selectedPreview,
  visiblePreviews,
  type PreviewsAction,
  type PreviewsState,
} from './previewsState'

/** The previews that the tool shows, and the actions of the tool. */
export interface PreviewActions {
  /** The previews of the tabs, in their order. */
  visible: readonly Preview[]
  /** The preview in the frame, or null while the form shows. */
  selected: Preview | null
  /** Opens a typed port or a listed server, or shows its open preview. */
  open: (port: number) => void
  /** Shows the preview of a tab. */
  follow: (previewId: string) => void
  /** Shows the form beside the tabs, after "+". */
  add: () => void
  close: (preview: Preview) => void
}

/**
 * The preview in the frame, and the actions of the tool. A port with an
 * open preview shows it with no request. The port of the address waits for
 * the list and for an open that runs, then opens once with the request of a
 * typed port. The address of its preview then takes the place of the
 * address of the port. After a failed open, the address of the tool takes
 * its place, and the form keeps the error.
 */
export function usePreviewActions(
  workspace: ToolRequests,
  route: PreviewRoute,
  state: PreviewsState,
  dispatch: (action: PreviewsAction) => void,
): PreviewActions {
  /**
   * The form shows after "+", and after a failed open of the port of the
   * address, until the address changes.
   */
  const [adding, setAdding] = useState<{ routeId: string | null } | null>(null)
  const mounted = useRef(false)
  /** The route of the last render, for a write that ends later. */
  const latestRoute = useRef(route)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    latestRoute.current = route
  })

  const visible = visiblePreviews(state)
  /** The open preview of a port, or null. */
  const previewOfPort = (port: number) =>
    visible.find((preview) => preview.port === port) ?? null
  // The open preview of the port of the address shows at once. Without
  // one, the form shows while the port opens.
  const portPreview = route.port === null ? null : previewOfPort(route.port)
  const formShown =
    route.port === null
      ? adding !== null && adding.routeId === route.previewId
      : portPreview === null
  const selected = formShown
    ? null
    : (portPreview ?? selectedPreview(visible, route.previewId))

  const follow = (previewId: string, current = route) => {
    setAdding(null)
    if (current.previewId !== previewId) current.navigate(previewId)
  }

  /** Sends the open request of a port. `then` gets the new preview, or null. */
  const request = (port: number, then: (previewId: string | null) => void) => {
    dispatch({ type: 'open' })
    void openPreview(workspace, port).then((result) => {
      if (!mounted.current) return
      dispatch(
        result.ok
          ? { type: 'opened', preview: result.value }
          : { type: 'open-failed', error: result.error },
      )
      then(result.ok ? result.value.id : null)
    })
  }

  const open = (port: number) => {
    const existing = previewOfPort(port)
    if (existing) {
      follow(existing.id)
      return
    }
    request(port, (previewId) => {
      // A port that the address named during the open shows in its place.
      const current = latestRoute.current
      if (previewId !== null && current.port === null) {
        follow(previewId, current)
      }
    })
  }

  /**
   * Puts the address of a preview in place of the address of its port, or
   * the address of the tool, with the form, after a failed open.
   */
  const leavePort = (previewId: string | null) => {
    setAdding(previewId === null ? { routeId: null } : null)
    latestRoute.current.replace(previewId)
  }

  useAddressPort(route.port, state.load === null && !state.opening, (port) => {
    const existing = previewOfPort(port)
    if (existing) {
      leavePort(existing.id)
      return
    }
    request(port, (previewId) => {
      // A move to another address before the answer keeps that address.
      if (latestRoute.current.port === port) leavePort(previewId)
    })
  })

  const close = (preview: Preview) => {
    dispatch({ type: 'close', previewId: preview.id })
    void closePreview(workspace, preview.id).then((result) => {
      if (!mounted.current) return
      dispatch(
        result.ok
          ? { type: 'closed', previewId: preview.id }
          : {
              type: 'close-failed',
              previewId: preview.id,
              error: result.error,
            },
      )
    })
  }

  const add = () => setAdding({ routeId: route.previewId })
  return { visible, selected, open, follow, add, close }
}
