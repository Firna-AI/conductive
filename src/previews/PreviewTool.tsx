import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { useWorkspaceStore } from '../app/workspace-store'
import type { Preview } from '../shared/previews'
import { ToolButton } from '../terminal/tool-parts/ToolButtons'
import { ToolRoot } from '../terminal/tool-parts/ToolRoot'
import { ToolMessage, ToolWaiting } from '../terminal/tool-parts/ToolStates'
import {
  workspaceKey,
  type ToolWorkspace,
} from '../terminal/tool-parts/workspace'
import { PreviewFrame } from './PreviewFrame'
import { PreviewOpenForm } from './PreviewOpenForm'
import { PreviewToolbar } from './PreviewToolbar'
import { closePreview, openPreview } from './previewsApi'
import { selectedPreview, visiblePreviews } from './previewsState'
import { createPreviewsStore, type PreviewsStore } from './previewsStore'
import styles from './PreviewTool.module.css'

/**
 * The app shell's addresses of the preview tabs. Tabs are links, so each
 * preview has an address in the browser history.
 */
export interface PreviewRoute {
  /** The preview that the current address names, or null. */
  previewId: string | null
  /** The address of the tab of one preview. */
  href: (previewId: string) => string
  /** Goes to the address of one preview without a page load. */
  navigate: (previewId: string) => void
}

export interface PreviewToolProps {
  workspace: ToolWorkspace
  route: PreviewRoute
  /** A phone layout: touch sizes. */
  touch: boolean
}

/**
 * The Preview tool: the web servers of the sandbox, each in a frame with an
 * "Open in new tab" link. The user opens a preview by its port.
 */
export function PreviewTool(props: PreviewToolProps) {
  return <PreviewToolBody key={workspaceKey(props.workspace)} {...props} />
}

function PreviewToolBody(props: PreviewToolProps) {
  const { workspace, route } = props
  const { fetch, subscribe } = workspace
  const connect = useCallback(
    (store: PreviewsStore) => store.connect({ fetch, subscribe }),
    [fetch, subscribe],
  )
  const { store, snapshot: state } = useWorkspaceStore(workspace, {
    create: createPreviewsStore,
    connect,
  })
  const { dispatch } = store
  /** The form shows after "+", until the address changes. */
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
  const formShown = adding !== null && adding.routeId === route.previewId
  const selected = formShown ? null : selectedPreview(visible, route.previewId)

  const follow = (previewId: string, current = route) => {
    setAdding(null)
    if (current.previewId !== previewId) current.navigate(previewId)
  }

  const open = (port: number) => {
    const existing = visible.find((preview) => preview.port === port)
    if (existing) {
      follow(existing.id)
      return
    }
    dispatch({ type: 'open' })
    void openPreview(workspace, port).then((result) => {
      if (!mounted.current) return
      if (!result.ok) {
        dispatch({ type: 'open-failed', error: result.error })
        return
      }
      dispatch({ type: 'opened', preview: result.value })
      follow(result.value.id, latestRoute.current)
    })
  }

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

  const reloadList = () => dispatch({ type: 'load' })

  let content
  if (state.load?.state === 'loading') {
    content = <ToolWaiting label="Loading previews" />
  } else if (state.load?.state === 'failed') {
    content = (
      <ToolMessage
        action={<ToolButton onPress={reloadList}>Try again</ToolButton>}
        alert
        body={state.load.error.message}
        icon={CircleAlert}
        title="The previews couldn't load"
      />
    )
  } else {
    const form = (
      <PreviewOpenForm
        error={state.openError}
        onOpen={open}
        opening={state.opening}
      />
    )
    const closeError =
      selected && state.closeError?.previewId === selected.id
        ? state.closeError.error
        : null
    content =
      visible.length === 0 ? (
        form
      ) : (
        <>
          <PreviewToolbar
            closing={selected !== null && state.closing.has(selected.id)}
            href={route.href}
            onAdd={() => setAdding({ routeId: route.previewId })}
            onClose={close}
            onFollow={follow}
            onReload={() => dispatch({ type: 'reload' })}
            previews={visible}
            selected={selected}
          />
          {closeError ? (
            <p className={styles.error} role="alert">
              The preview couldn&apos;t close. {closeError.message}
            </p>
          ) : null}
          {selected ? (
            <div className={styles.frame}>
              <PreviewFrame
                key={`${selected.id}:${state.reloads}`}
                preview={selected}
              />
            </div>
          ) : (
            form
          )}
        </>
      )
  }
  return <ToolRoot touch={props.touch}>{content}</ToolRoot>
}
