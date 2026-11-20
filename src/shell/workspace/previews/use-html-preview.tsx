import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
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
import {
  KeptPageFrame,
  samePage,
  usePageFrames,
  type FramedPage,
} from './page-frames'

/** An open of this show that failed, which shows in place of the page. */
type OpenFailure = Extract<HtmlPageView, { kind: 'failed' | 'older-software' }>

/**
 * The preview of the tab of an HTML file, for `FilePage`, or undefined for
 * another tab. The file page calls `show` while it shows the page, and the
 * hook opens the files preview of the workspace once for each show, when
 * the app has none. A show is the first show of the page, a visit that
 * shows the tab again, as `useTabVisits` says, and Reload and Try again
 * while the app has no files preview. When the workspace leaves Starting,
 * as after a Restart or a resume, the next show that the hook serves opens
 * the files preview again also while the app keeps one: the show that runs,
 * or the first show after it. The open answers the one that lives.
 * It waits while the sandbox does not run and while an open runs. After a
 * failed open, it asks again only at the next show, so a refusal sends no
 * loop of requests, as `useTabPreview` does for a Preview tab. A files
 * preview that ends while the page shows keeps the page until the next
 * show, because the protocol opens a new one at the next show of the tab.
 *
 * While the cloud computer does not run, the hook builds no page from the
 * files preview record, which a Restart keeps. A tab keeps only the page
 * that it shows when Starting begins, and only while that show runs. Each
 * other tab, and a tab whose show ends, shows the state of the cloud
 * computer. Reload is then a show, and Open hides.
 *
 * The tab keeps the page that it showed after its files preview ends, such
 * as while the cloud computer stops, until a new files preview or a failed
 * open. The frame loads again at a new files preview, at a new version of
 * the file, and at Reload. The file page renders the frame only while it
 * shows the page. On desktop the frame is a `KeptPageFrame`, so the chat
 * keeps the page loaded, as `KeptPageFrames` says. On a phone the page
 * shows its own frame.
 *
 * An open belongs to the connection of the screen in which it started. Its
 * answer after the end of that connection changes nothing, and a show that
 * a new connection finds opens again, because the end of the connection
 * forgot the files preview.
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
  /**
   * The show from which the hook opens the files preview again, also while
   * the app has one: the count of shows when the workspace left Starting.
   */
  const [renews, setRenews] = useState<number | null>(null)
  /** The last show that its open served, as its connection and its count. */
  const served = useRef<string | null>(null)
  /** The renewal that an open already served, so each renewal opens once. */
  const renewed = useRef<number | null>(null)
  const [failure, setFailure] = useState<{
    path: string
    failure: OpenFailure
  } | null>(null)
  const [shownPage, setShownPage] = useState<FramedPage | null>(null)
  const [reloads, setReloads] = useState(0)

  // Another tab ends the show, the failure, and the page of the last one.
  // The file page of the new tab starts its own show.
  const [lastPath, setLastPath] = useState(path)
  if (path !== lastPath) {
    setLastPath(path)
    setShowing(false)
    setFailure(null)
    setShownPage(null)
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

  const { preview, opening, connection } = state
  const openFailure = failure?.path === path ? failure.failure : null
  useEffect(() => {
    if (path === null || !showing) return
    // The store, not this render, says whether an open runs, so a second
    // run of the effect starts no second open. A show counts as served in
    // one connection: a new connection forgot the files preview.
    const current = store.getSnapshot()
    const thisShow = `${current.connection}:${shows}`
    if (served.current === thisShow || !ready || current.opening) return
    served.current = thisShow
    if (openFailure !== null) return
    // The first show that the hook serves after the workspace left Starting
    // renews the files preview: the show that runs, or a show that starts
    // with the page, which the hook builds again only once the sandbox runs.
    const renewing = renews !== null && renewed.current !== renews
    if (current.preview !== null && !renewing) return
    renewed.current = renews
    const startedIn = current.connection
    store.dispatch({ type: 'open' })
    void openFilesPreview(requests).then((result) => {
      // The answer of a connection that ended is no longer current.
      if (store.getSnapshot().connection !== startedIn) return
      if (result.ok) {
        store.dispatch({
          type: 'opened',
          preview: result.value,
          connection: startedIn,
        })
        return
      }
      store.dispatch({ type: 'open-failed', connection: startedIn })
      const { code, message } = result.error
      setShownPage(null)
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
    connection,
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
  // While the cloud computer does not run, a Restart keeps the files
  // preview record, but the hook builds no page from it. A tab keeps only
  // the page that it shows, while that show runs, so each other tab shows
  // the state of the cloud computer.
  const live: FramedPage | null =
    path !== null && preview !== null && ready
      ? { path, name, preview, version }
      : null
  if (live && (shownPage === null || !samePage(shownPage, live))) {
    setShownPage(live)
  }
  if (!ready && !showing && shownPage !== null) setShownPage(null)
  const page = live ?? (shownPage?.path === path ? shownPage : null)

  const reload = () => {
    if (path === null) return
    if (live !== null && openFailure === null) {
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
      frame: frames ? (
        <KeptPageFrame frames={frames} page={page} />
      ) : (
        <PreviewFrame
          file={{ path, name }}
          key={`${page.preview.id}:${page.version}:${reloads}`}
          preview={page.preview}
        />
      ),
      kept: frames !== null,
    }
  }
  return {
    view,
    open: live ? <OpenInNewTab path={path} preview={live.preview} /> : null,
    reload,
    // Only a kept frame can show in the large window, so a phone has none.
    expand:
      live && frames && openFailure === null ? () => frames.expand(path) : null,
    show,
  }
}

/** The subscription of a tab that is no HTML file: to nothing. */
function followNothing(): () => void {
  return () => {}
}
