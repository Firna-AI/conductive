import { useEffect, useState, type ReactNode } from 'react'
import page from '../../../ui/components/tools/PreviewPage.module.css'
import {
  previewTabLabel,
  serverDescription,
} from '../../../ui/components/tools/previewCopy'
import { useNavigation } from '../../../app/navigation'
import type { RenderedTab } from '../../../chat/components/tab-row'
import { OpenInNewTab } from '../../../previews/PreviewFrame'
import { previewOfPort, visiblePreviews } from '../../../previews/previewsState'
import type { WorkspaceContext } from '../features'
import { SandboxPanel } from '../SandboxNotice'
import { contentState } from '../sandbox-view'
import { useSavedView, useViewKnown } from '../saved-view'
import { previewPortHref, toolPlace } from '../tools/tool-address'
import { usePreviewsState } from './kept-previews'
import { KeptPreviewFrames, PreviewTabPage } from './PreviewPages'
import { PreviewTab } from './PreviewTab'
import { LiftedPreviewTab } from './PreviewTabItem'
import {
  previewTabPort,
  previewTabsOf,
  withPreviewTab,
  type PreviewTab as SavedPreviewTab,
} from './preview-place'
import { useTabPreview } from './use-tab-preview'

/** What the chat gets from the Preview tabs of the desktop. */
export interface PreviewCentre {
  /** Names and draws a Preview tab of the row. */
  renderTab: (tab: SavedPreviewTab) => RenderedTab
  /** The bar of the shown Preview tab in place of the chat, or null. */
  content: ReactNode
  /** The kept pages of the Preview tabs, under the content. */
  kept: ReactNode
}

/**
 * The Preview tabs of the centre row on desktop (decisions 288 to 292). The
 * address `preview/port/<port>` shows the tab of the port, and saves it as
 * open and active. The address of a preview names its port in its place.
 * A shown tab whose port has no open preview opens one, with no notice.
 * Each page mounts at the first show of its tab and stays loaded while
 * another tab shows, until its tab closes or the sandbox stops. Reload
 * loads the page of the shown tab again, or asks for a new open after a
 * failure. While the sandbox does not run, the shown tab holds its state.
 * Expand shows the page of the shown tab in its large window. The window
 * closes at Close, and when another tab shows or the page goes.
 */
export function usePreviewCentre(context: WorkspaceContext): PreviewCentre {
  const navigation = useNavigation()
  const { org, workspace, savedView } = context
  const port = previewTabPort(context)
  const { state } = usePreviewsState(context)
  const view = useSavedView(savedView)
  const known = useViewKnown(savedView)
  const shown = useTabPreview(context, port)
  const [mounted, setMounted] = useState<readonly number[]>([])
  const [reloads, setReloads] = useState<ReadonlyMap<number, number>>(
    () => new Map(),
  )
  const [expanded, setExpanded] = useState<number | null>(null)
  if (port !== null && !mounted.includes(port)) setMounted([...mounted, port])

  useEffect(() => {
    if (known && port !== null) {
      savedView.updateView((current) => withPreviewTab(current, port))
    }
  }, [savedView, known, port])

  // On desktop, the address of a preview shows the tab of its port.
  const place = toolPlace(context.view)
  const desktop = context.viewport !== 'phone' && context.sandbox !== 'archived'
  const addressed =
    desktop && place?.tool === 'preview' ? place.previewId : null
  const loaded = state.load === null
  const addressedPort =
    addressed === null || !loaded
      ? null
      : (visiblePreviews(state).find((each) => each.id === addressed)?.port ??
        null)
  useEffect(() => {
    if (addressedPort === null) return
    navigation.replace(previewPortHref(org.id, workspace.id, addressedPort))
  }, [addressedPort, navigation, org.id, workspace.id])

  const visible = visiblePreviews(state)
  const tabs = previewTabsOf(view)
  const open = new Set(tabs.map((tab) => tab.port))
  const runs = context.sandbox === 'ready'
  const frames = runs
    ? mounted
        .filter((each) => !known || open.has(each) || each === port)
        .flatMap((each) => {
          const preview = previewOfPort(visible, each)
          if (!preview) return []
          return [{ port: each, preview, reloads: reloads.get(each) ?? 0 }]
        })
    : []

  const shownFrame = frames.find((each) => each.port === port) ?? null
  if (expanded !== null && (!desktop || shownFrame?.port !== expanded)) {
    setExpanded(null)
  }

  const reload = () => {
    if (port === null) return
    if (shown.preview === null) {
      shown.retry()
      return
    }
    setReloads(new Map(reloads).set(port, (reloads.get(port) ?? 0) + 1))
  }

  let content: ReactNode = null
  if (port !== null) {
    const down = contentState(context)
    content = down ? (
      <div className={page.page}>
        <SandboxPanel
          phone
          resume={context.resume}
          state={down}
          workspace={context.workspace}
        />
      </div>
    ) : (
      <PreviewTabPage
        error={shown.error}
        listFailed={shown.listFailed}
        onExpand={
          desktop && shownFrame ? () => setExpanded(shownFrame.port) : null
        }
        onReload={reload}
        port={port}
        preview={shown.preview}
      />
    )
  }

  const labelOf = (each: number) =>
    previewTabLabel(
      each,
      state.ports?.find((server) => server.port === each),
    )
  const expandedFrame =
    shownFrame && expanded === shownFrame.port
      ? {
          title: labelOf(shownFrame.port),
          open: <OpenInNewTab preview={shownFrame.preview} />,
          reload,
          close: () => setExpanded(null),
        }
      : null

  const renderTab = (tab: SavedPreviewTab): RenderedTab => {
    const server = state.ports?.find((each) => each.port === tab.port)
    const label = labelOf(tab.port)
    const description = server ? serverDescription(server) : undefined
    return {
      title: label,
      draw: (draw) =>
        draw.kind === 'lifted' ? (
          <LiftedPreviewTab label={label} />
        ) : (
          <PreviewTab
            context={context}
            description={description}
            draw={draw}
            label={label}
            shown={port}
            tab={tab}
          />
        ),
      show: () =>
        navigation.push(previewPortHref(org.id, workspace.id, tab.port)),
      keep: null,
      // A Preview tab names a port, not a file, so its menu has no Copy path.
      copyPath: null,
    }
  }

  return {
    renderTab,
    content,
    kept: desktop ? (
      <KeptPreviewFrames
        expanded={expandedFrame}
        frames={frames}
        shown={port}
      />
    ) : null,
  }
}
