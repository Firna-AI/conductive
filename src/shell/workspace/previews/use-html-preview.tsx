import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { Preview } from '../../../shared/generated/Preview'
import { FILE_SERVER_UNAVAILABLE } from '../../../shared/previews'
import { showsAsPage } from '../../../files/code/file-kind'
import { labelName, tabLabel } from '../../../files/model/file-labels'
import {
  versionOf,
  type WorkspaceFiles,
} from '../../../files/model/files-store'
import type { FilesTab } from '../../../files/navigation'
import type {
  HtmlPageView,
  HtmlPreview,
} from '../../../files/page/html-preview'
import { openFilesPreview } from '../../../previews/previewsApi'
import { OpenInNewTab, PreviewFrame } from '../../../previews/PreviewFrame'
import type { ToolRequests } from '../../../terminal/tool-parts/workspace'
import { useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { useTabVisits } from '../tab-visits'
import { useFilesPreviewState } from './kept-files-preview'
import { samePage, usePageFrames, type FramedPage } from './page-frames'

/** An open of this show that failed, which shows in place of the page. */
type OpenFailure = Extract<HtmlPageView, { kind: 'failed' | 'older-software' }>

/**
 * The preview of the tab of an HTML file, for `FilePage`, or undefined for
 * another tab. The file page calls `show` while it shows the page, and the
 * hook opens the files preview of the workspace once for each show, when
 * the app has none. A show is the first show of the page, a visit that
 * shows the tab again, as `useTabVisits` says, and Reload and Try again
 * while the app has no files preview. When the workspace leaves Starting,
 * as after a Restart or a resume, the show opens the files preview again
 * also while the app keeps one, and the open answers the one that lives.
 * It waits while the sandbox does not run and while an open runs. After a
 * failed open, it asks again only at the next show, so a refusal sends no
 * loop of requests, as `useTabPreview` does for a Preview tab. A files
 * preview that ends while the page shows keeps the page until the next
 * show, because the protocol opens a new one at the next show of the tab.
 *
 * The tab keeps the page that it showed after its files preview ends, such
 * as while the cloud computer stops, until a new files preview or a failed
 * open. The frame loads again at a new files preview, at a new version of
 * the file, and at Reload. On desktop the chat keeps the frame, as
 * `KeptPageFrames` says. On a phone the page shows its own frame.
 */
export function useHtmlPreview(
  context: WorkspaceContext,
  tab: FilesTab,
  files: WorkspaceFiles,
): HtmlPreview | undefined {
  const path = tab.kind === 'file' && showsAsPage(tab.path) ? tab.path : null
  // Only the tab of an HTML file follows the files, for the label and the
  // version of its file.
  const read = () => (path === null ? null : files.getSnapshot())
  const snapshot = useSyncExternalStore(
    path === null ? followNothing : files.subscribe,
    read,
    read,
  )
  const { store, state } = useFilesPreviewState(context)
  const frames = usePageFrames()
  const fetch = useOrgServices(context.org.id).api.fetch
  const { org, workspace } = context
  const requests = useMemo<ToolRequests>(
    () => ({ orgId: org.id, workspaceId: workspace.id, fetch }),
    [org.id, workspace.id, fetch],
  )
  const [showing, setShowing] = useState(false)
  /** Grows at each show. The open of a show runs once. */
  const [shows, setShows] = useState(0)
  /** The show that opens the files preview also while the app has one. */
  const [renews, setRenews] = useState<number | null>(null)
  const served = useRef<number | null>(null)
  const [failure, setFailure] = useState<{
    path: string
    failure: OpenFailure
  } | null>(null)
  const [kept, setKept] = useState<FramedPage | null>(null)
  const [reloads, setReloads] = useState(0)

  // Another tab ends the failure and the page of the last one.
  const [lastPath, setLastPath] = useState(path)
  if (path !== lastPath) {
    setLastPath(path)
    setFailure(null)
    setKept(null)
    setReloads(0)
  }
  // The return of the sandbox, as when the workspace leaves Starting after
  // a Restart or a resume, is a show that opens the files preview again,
  // also while the app keeps one. The open answers the one that lives, or
  // a new one after the end of the old one.
  const ready = context.sandbox === 'ready'
  const [wasReady, setWasReady] = useState(ready)
  if (ready !== wasReady) {
    setWasReady(ready)
    if (ready) {
      setFailure(null)
      setShows(shows + 1)
      setRenews(shows + 1)
    }
  }
  useTabVisits(context, (visited) => {
    if (path !== null && visited === `file:${path}`) {
      setFailure(null)
      setShows((count) => count + 1)
    }
  })
  const show = useCallback(() => {
    setShowing(true)
    setShows((count) => count + 1)
    return () => setShowing(false)
  }, [])

  const { preview, opening } = state
  const openFailure = failure?.path === path ? failure.failure : null
  useEffect(() => {
    if (path === null || !showing || served.current === shows) return
    // The store, not this render, says whether an open runs, so a second
    // run of the effect starts no second open.
    const current = store.getSnapshot()
    if (!ready || current.opening) return
    served.current = shows
    if (openFailure !== null) return
    if (current.preview !== null && renews !== shows) return
    store.dispatch({ type: 'open' })
    void openFilesPreview(requests).then((result) => {
      if (result.ok) {
        store.dispatch({ type: 'opened', preview: result.value })
        return
      }
      store.dispatch({ type: 'open-failed' })
      const { code, message } = result.error
      setKept(null)
      setFailure({
        path,
        failure:
          code === FILE_SERVER_UNAVAILABLE
            ? { kind: 'older-software' }
            : { kind: 'failed', message },
      })
    })
  }, [
    path,
    showing,
    shows,
    renews,
    ready,
    opening,
    preview,
    openFailure,
    store,
    requests,
  ])

  const name =
    path === null || snapshot === null
      ? ''
      : labelName(tabLabel(snapshot, path, 'file'))
  const version =
    path === null || snapshot === null ? '' : versionOf(snapshot, path)
  const live: FramedPage | null =
    path !== null && preview !== null ? { path, name, preview, version } : null
  if (live && (kept === null || !samePage(kept, live))) setKept(live)
  const page = live ?? (kept?.path === path ? kept : null)
  const pagePreview: Preview | null = page?.preview ?? null
  const pageVersion = page?.version ?? null
  useLayoutEffect(() => {
    if (!frames || !showing || path === null) return undefined
    if (pagePreview === null || pageVersion === null) return undefined
    return frames.show({
      path,
      name,
      preview: pagePreview,
      version: pageVersion,
    })
  }, [frames, showing, path, name, pagePreview, pageVersion])

  const reload = () => {
    if (path === null) return
    if (preview !== null && openFailure === null) {
      // A files preview lives, so the frame loads the page again.
      if (frames) frames.reload(path)
      else setReloads((count) => count + 1)
      return
    }
    // Reload and Try again are a show: they open the files preview again.
    setFailure(null)
    setShows((count) => count + 1)
  }

  if (path === null) return undefined
  let view: HtmlPageView = openFailure ?? { kind: 'opening' }
  if (openFailure === null && page !== null) {
    view = {
      kind: 'page',
      frame: frames ? null : (
        <PreviewFrame
          file={{ path, name }}
          key={`${page.preview.id}:${page.version}:${reloads}`}
          preview={page.preview}
        />
      ),
    }
  }
  return {
    view,
    open: preview ? <OpenInNewTab path={path} preview={preview} /> : null,
    reload,
    show,
  }
}

/** The subscription of a tab that is no HTML file: to nothing. */
function followNothing(): () => void {
  return () => {}
}
