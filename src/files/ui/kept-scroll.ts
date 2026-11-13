import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react'

/** The scroll offset of a box, down and sideways, as the box gives them. */
export interface ScrollOffset {
  top: number
  left: number
}

/**
 * The scroll offsets of the file and diff tabs of one workspace, by tab and
 * view, and the tab that shows now.
 */
export interface KeptScrollTab {
  places: Map<string, ScrollOffset>
  /** The key of the shown tab, such as `file:src/app.ts`. */
  tab: string
}

/** The key of a file or diff tab in the kept offsets. */
export function scrollTabKey(tab: { kind: string; path: string }): string {
  return `${tab.kind}:${tab.path}`
}

/** The key of the kept offset of `view` in the tab with the key `tab`. */
const placeKey = (tab: string, view: string) => `${tab}\n${view}`

/**
 * Forgets the offsets of each tab whose key is not in `open`, such as a file
 * tab that the user closed, so it starts at the top when it opens again.
 * While the tabs load, `open` is null and nothing goes.
 */
export function useForgetClosedTabs(
  places: Map<string, ScrollOffset> | null,
  open: readonly string[] | null,
): void {
  const key = open?.join('\n') ?? null
  useEffect(() => {
    if (places === null || key === null) return
    const kept = new Set(key.split('\n'))
    for (const place of places.keys()) {
      const [tab = ''] = place.split('\n')
      if (!kept.has(tab)) places.delete(place)
    }
  }, [places, key])
}

/** The tab whose scroll the views keep. Outside a tab, no view keeps it. */
export const KeptScroll = createContext<KeptScrollTab | null>(null)

/** The input of a reader that scrolls, which ends a wait for a saved offset. */
const readerInput = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

/**
 * The ref of the scroll box of `view`, such as `code` or `preview`, whose
 * offset the shown tab keeps, down and sideways, because a line of code can
 * be wider than the box. At its mount the box shows the kept offset.
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
    const key = placeKey(tab.tab, view)
    const saved = tab.places.get(key) ?? { top: 0, left: 0 }
    let waiting = saved.top > 0 || saved.left > 0
    const restore = () => {
      if (!waiting) return
      element.scrollTop = saved.top
      element.scrollLeft = saved.left
      const reached = (now: number, kept: number) => now >= kept - 1
      if (
        reached(element.scrollTop, saved.top) &&
        reached(element.scrollLeft, saved.left)
      ) {
        waiting = false
      }
    }
    const keep = () => {
      if (waiting) return
      tab.places.set(key, { top: element.scrollTop, left: element.scrollLeft })
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
