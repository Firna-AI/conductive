import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react'
import type { TabPlaces } from '../../app/tab-places'

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
  places: TabPlaces<ScrollOffset>
  /** The key of the shown tab, such as `file:src/app.ts`. */
  tab: string
}

/** The key of a file or diff tab in the kept offsets. */
export function scrollTabKey(tab: { kind: string; path: string }): string {
  return `${tab.kind}:${tab.path}`
}

/** The tab whose scroll the views keep. Outside a tab, no view keeps it. */
export const KeptScroll = createContext<KeptScrollTab | null>(null)

/**
 * A place that the address of a tab names, such as the lines of a file
 * chip. `key` names the place, so a new key scrolls again. `offset` gives
 * the offset of the place in the box, or null when the box does not hold
 * it.
 */
export interface ScrollAim {
  key: string
  offset: (box: HTMLDivElement) => ScrollOffset | null
}

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
 *
 * With `aim`, the box shows the place that the address names in place of
 * the kept offset, and a new key of the aim scrolls again. A new content of
 * the box, such as a change of the file, does not scroll. The box is the
 * one owner of its scroll, so the aim and the kept offset never race.
 */
export function useKeptScroll(
  view: string,
  aim?: ScrollAim | null,
): RefObject<HTMLDivElement | null> {
  const tab = useContext(KeptScroll)
  const box = useRef<HTMLDivElement>(null)
  const waiting = useRef(false)
  const latestAim = useRef(aim)
  useLayoutEffect(() => {
    latestAim.current = aim
  })
  useLayoutEffect(() => {
    const element = box.current
    if (!tab || !element) return
    const saved = tab.places.get(tab.tab, view) ?? { top: 0, left: 0 }
    // An aim takes the place of the kept offset, so the box waits for none.
    waiting.current = !latestAim.current && (saved.top > 0 || saved.left > 0)
    const restore = () => {
      if (!waiting.current) return
      element.scrollTop = saved.top
      element.scrollLeft = saved.left
      const reached = (now: number, kept: number) => now >= kept - 1
      if (
        reached(element.scrollTop, saved.top) &&
        reached(element.scrollLeft, saved.left)
      ) {
        waiting.current = false
      }
    }
    const keep = () => {
      if (waiting.current) return
      const offset = { top: element.scrollTop, left: element.scrollLeft }
      tab.places.set(tab.tab, offset, view)
    }
    const stopWaiting = () => {
      waiting.current = false
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
  const aimKey = aim?.key ?? null
  useLayoutEffect(() => {
    const element = box.current
    const current = latestAim.current
    if (aimKey === null || !element || !current) return
    const offset = current.offset(element)
    if (!offset) return
    waiting.current = false
    element.scrollTop = offset.top
    element.scrollLeft = offset.left
  }, [aimKey])
  return box
}
