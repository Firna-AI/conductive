import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react'

/**
 * The scroll offsets of the file and diff tabs of one workspace, by tab and
 * view, and the tab that shows now.
 */
export interface KeptScrollTab {
  places: Map<string, number>
  /** The key of the shown tab, such as `file:src/app.ts`. */
  tab: string
}

/** The tab whose scroll the views keep. Outside a tab, no view keeps it. */
export const KeptScroll = createContext<KeptScrollTab | null>(null)

/** The input of a reader that scrolls, which ends a wait for a saved offset. */
const readerInput = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

/**
 * The ref of the scroll box of `view`, such as `code` or `preview`, whose
 * offset the shown tab keeps. At its mount the box shows the kept offset.
 * Content that grows after the mount, such as a preview with pictures, can
 * be too short for it at first. So the box tries again at each change of
 * size, until it reaches the offset or the reader scrolls. Until then a
 * scroll keeps nothing, so a short box never replaces the kept offset.
 */
export function useKeptScroll(view: string): RefObject<HTMLDivElement | null> {
  const tab = useContext(KeptScroll)
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = box.current
    if (!tab || !element) return
    const key = `${tab.tab}\n${view}`
    const saved = tab.places.get(key) ?? 0
    let waiting = saved > 0
    const restore = () => {
      if (!waiting) return
      element.scrollTop = saved
      if (element.scrollTop >= saved - 1) waiting = false
    }
    const keep = () => {
      if (!waiting) tab.places.set(key, element.scrollTop)
    }
    const stopWaiting = () => {
      waiting = false
    }
    restore()
    element.addEventListener('scroll', keep, { passive: true })
    for (const type of readerInput) {
      element.addEventListener(type, stopWaiting, { passive: true })
    }
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore)
    observer?.observe(element)
    if (element.firstElementChild) observer?.observe(element.firstElementChild)
    return () => {
      observer?.disconnect()
      element.removeEventListener('scroll', keep)
      for (const type of readerInput) {
        element.removeEventListener(type, stopWaiting)
      }
    }
  }, [tab, view])
  return box
}
