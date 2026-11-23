import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from 'react'
import page from '../../../ui/components/tools/PreviewPage.module.css'
import type { Preview } from '../../../shared/generated/Preview'
import { OpenInNewTab, PreviewFrame } from '../../../previews/PreviewFrame'
import type { WorkspaceContext } from '../features'
import { filesTabsOf } from '../files/view-tabs'
import { useSavedView, useViewKnown } from '../saved-view'
import { ExpandableFrames } from './ExpandableFrames'
import { useFilesPreviewState } from './kept-files-preview'

/** The page of an HTML file that a tab shows in its frame. */
export interface FramedPage {
  /** The real path of the file, which the launch address names. */
  path: string
  /** The file name of the label of the path, which names the frame. */
  name: string
  /** The files preview whose page the frame loads. */
  preview: Preview
  /** The version of the file at the load. A new version loads it again. */
  version: string
}

/** A kept page, with the count of its Reloads. */
interface KeptPage extends FramedPage {
  reloads: number
}

interface PageFramesSnapshot {
  /** The kept pages, in the order of their first show. */
  pages: readonly KeptPage[]
  /** The path whose page shows, or null. */
  shown: string | null
  /** The path whose page shows in its large window, or null. */
  expanded: string | null
}

/** Whether two pages load the same thing: the same file, preview, and version. */
export function samePage(left: FramedPage, right: FramedPage): boolean {
  return (
    left.path === right.path &&
    left.name === right.name &&
    left.preview === right.preview &&
    left.version === right.version
  )
}

/**
 * The pages of the tabs of HTML files on desktop, each in its frame, so a
 * page stays loaded while another tab shows. Only `KeptPageFrame`, which the
 * file page renders while it shows the page, puts a page here with `show`,
 * and the page mounts at that first show. A page keeps its place in the
 * order, because a frame that moves loads again. Each screen of a workspace
 * has its own.
 */
export class PageFrames {
  private snapshot: PageFramesSnapshot = {
    pages: [],
    shown: null,
    expanded: null,
  }
  private readonly listeners = new Set<() => void>()

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  readonly getSnapshot = (): PageFramesSnapshot => this.snapshot

  /**
   * Shows the page in its frame until the result runs. A new files preview
   * or a new version of the file loads the page again.
   */
  show(shown: FramedPage): () => void {
    const { pages } = this.snapshot
    const kept = pages.find((each) => each.path === shown.path)
    let next: readonly KeptPage[] = [...pages, { ...shown, reloads: 0 }]
    if (kept) {
      next = samePage(kept, shown)
        ? pages
        : pages.map((each) =>
            each === kept ? { ...shown, reloads: each.reloads } : each,
          )
    }
    const expanded = this.snapshot.expanded === shown.path ? shown.path : null
    this.set({ pages: next, shown: shown.path, expanded })
    // The end of a show keeps the window, because the show of a new
    // version of the same page ends the show of the old one first.
    // `KeptPageFrames` closes the window when its page no longer shows.
    return () => {
      if (this.snapshot.shown === shown.path) {
        this.set({ ...this.snapshot, shown: null })
      }
    }
  }

  /** Shows the page of `path` in its large window, while it shows. */
  expand(path: string): void {
    if (this.snapshot.shown === path) {
      this.set({ ...this.snapshot, expanded: path })
    }
  }

  /** Closes the large window. */
  collapse(): void {
    this.set({ ...this.snapshot, expanded: null })
  }

  /** Loads the page of `path` again, as Reload does. */
  reload(path: string): void {
    const pages = this.snapshot.pages.map((each) =>
      each.path === path ? { ...each, reloads: each.reloads + 1 } : each,
    )
    this.set({ ...this.snapshot, pages })
  }

  private set(next: PageFramesSnapshot): void {
    const { pages, shown, expanded } = this.snapshot
    if (
      next.pages === pages &&
      next.shown === shown &&
      next.expanded === expanded
    ) {
      return
    }
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }
}

/**
 * Puts the page into the kept frames, and shows it there, while the file
 * page renders it. The file page renders it only while it shows the page
 * of its file, so no other file can start a frame: not a tab in Source,
 * and not a file whose label hides a secret value or is not known yet. Its
 * end hides the page, which stays loaded while its tab is open and its
 * files preview lives. It draws nothing in place.
 */
export function KeptPageFrame(props: { frames: PageFrames; page: FramedPage }) {
  const { frames } = props
  const { path, name, preview, version } = props.page
  useLayoutEffect(
    () => frames.show({ path, name, preview, version }),
    [frames, path, name, preview, version],
  )
  return null
}

/**
 * The kept pages of the screen, which the chat draws under the tab that
 * shows. Null on a phone, where nothing is kept, and outside the chat.
 */
export const PageFramesContext = createContext<PageFrames | null>(null)

/** The kept pages of the screen, or null where the page shows its own frame. */
export function usePageFrames(): PageFrames | null {
  return useContext(PageFramesContext)
}

/**
 * The kept pages of the tabs of HTML files, each in its frame, under the
 * tab that shows, as the pages of the Preview tabs. Only the page that its
 * tab shows is visible. A page stays loaded and hidden while another tab
 * shows, until its tab closes or its files preview ends. The page that
 * shows stays while its files preview ends, as when the cloud computer
 * stops, because its tab keeps the page that it already shows.
 *
 * Expand shows the page that shows in its large window, while its files
 * preview lives. The window closes at Close, when another tab shows, and
 * when the files preview ends, because Reload and Open then need a new
 * files preview, which only the tab opens.
 */
export function KeptPageFrames(props: {
  context: WorkspaceContext
  frames: PageFrames
}) {
  const { context, frames } = props
  const { pages, shown, expanded } = useSyncExternalStore(
    frames.subscribe,
    frames.getSnapshot,
    frames.getSnapshot,
  )
  const { state } = useFilesPreviewState(context)
  const view = useSavedView(context.savedView)
  const known = useViewKnown(context.savedView)
  const open = new Set(
    filesTabsOf(view)
      .filter((tab) => tab.kind === 'file')
      .map((tab) => tab.path),
  )
  const live = state.preview?.id ?? null
  const kept = pages.filter(
    (each) =>
      each.path === shown ||
      ((!known || open.has(each.path)) && each.preview.id === live),
  )
  const shownPage = kept.find((each) => each.path === shown) ?? null
  const expandedPage =
    shownPage && shownPage.path === expanded && shownPage.preview.id === live
      ? shownPage
      : null
  useEffect(() => {
    if (expanded !== null && expandedPage === null) frames.collapse()
  }, [frames, expanded, expandedPage])
  if (kept.length === 0) return null
  return (
    <ExpandableFrames
      expanded={
        expandedPage && {
          title: expandedPage.name,
          open: (
            <OpenInNewTab
              path={expandedPage.path}
              preview={expandedPage.preview}
            />
          ),
          reload: () => frames.reload(expandedPage.path),
          close: () => frames.collapse(),
        }
      }
      visible={shownPage !== null}
    >
      {kept.map((each) => (
        <div
          className={page.frame}
          hidden={each.path !== shown}
          key={each.path}
        >
          <PreviewFrame
            file={{ path: each.path, name: each.name }}
            key={`${each.preview.id}:${each.version}:${each.reloads}`}
            preview={each.preview}
          />
        </div>
      ))}
    </ExpandableFrames>
  )
}
