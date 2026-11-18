import { createContext, useContext, useSyncExternalStore } from 'react'
import page from '../../../../docs/mockups/src/components/tools/PreviewPage.module.css'
import type { Preview } from '../../../shared/generated/Preview'
import { PreviewFrame } from '../../../previews/PreviewFrame'
import type { WorkspaceContext } from '../features'
import { filesTabsOf } from '../files/view-tabs'
import { useSavedView, useViewKnown } from '../saved-view'
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
 * page stays loaded while another tab shows. The tab that shows the page of
 * its file puts it here with `show`, and the page mounts at that first
 * show. A page keeps its place in the order, because a frame that moves
 * loads again. Each screen of a workspace has its own.
 */
export class PageFrames {
  private snapshot: PageFramesSnapshot = { pages: [], shown: null }
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
    this.set({ pages: next, shown: shown.path })
    return () => {
      if (this.snapshot.shown === shown.path) {
        this.set({ ...this.snapshot, shown: null })
      }
    }
  }

  /** Loads the page of `path` again, as Reload does. */
  reload(path: string): void {
    const pages = this.snapshot.pages.map((each) =>
      each.path === path ? { ...each, reloads: each.reloads + 1 } : each,
    )
    this.set({ ...this.snapshot, pages })
  }

  private set(next: PageFramesSnapshot): void {
    const { pages, shown } = this.snapshot
    if (next.pages === pages && next.shown === shown) return
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }
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
 */
export function KeptPageFrames(props: {
  context: WorkspaceContext
  frames: PageFrames
}) {
  const { context, frames } = props
  const { pages, shown } = useSyncExternalStore(
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
  if (kept.length === 0) return null
  return (
    <div
      className={page.page}
      hidden={!kept.some((each) => each.path === shown)}
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
    </div>
  )
}
