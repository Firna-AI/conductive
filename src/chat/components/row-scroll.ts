import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { placeOf, revealKeys, samePlace, type Place } from './row-reveal'
import type { TabNodes } from './tab-nodes'

/** The ends of the row that clip tabs, which show a fade. */
export interface RowFades {
  start: boolean
  end: boolean
}

/** A drag this close to an end of the row, in CSS px, scrolls the row. */
const edgeZone = 32
/** The most that a drag near an end scrolls the row in one frame, in CSS px. */
const edgeStep = 12

function fadesOf(row: HTMLElement): RowFades {
  const end = row.scrollWidth - row.clientWidth
  return { start: row.scrollLeft > 1, end: row.scrollLeft < end - 1 }
}

/** Watches the size of each tab of the row, and of no tab that left it. */
function watchTabs(
  row: HTMLElement,
  observer: ResizeObserver,
  watched: Set<Element>,
): void {
  for (const tab of row.children) {
    if (!watched.has(tab)) observer.observe(tab)
    watched.add(tab)
  }
  for (const tab of watched) {
    if (tab.parentNode === row) continue
    observer.unobserve(tab)
    watched.delete(tab)
  }
}

/** Whether the row holds the same tabs in the same order. */
function sameKeys(
  last: readonly string[] | null,
  next: readonly string[],
): boolean {
  return (
    last !== null &&
    last.length === next.length &&
    last.every((key, index) => key === next[index])
  )
}

/** What the row remembers of its last render, and of the kept tab. */
interface Seen {
  keys: readonly string[] | null
  kept: string | null | undefined
  moved: { key: string } | null
  /** The place of the kept tab at the last check. */
  place: Place | null
}

/**
 * The tabs that a render scrolls into view, in the order of `reveal`: the
 * moved tab and the kept tab after a move, the kept tab when it changed,
 * and the kept tab and a tab that opened. Null when the render brings none
 * of these.
 */
function shownAfter(
  before: Seen,
  keys: readonly string[],
  kept: string | null,
  moved: { key: string } | null,
): (string | null)[] | null {
  if (moved !== null && moved !== before.moved) return [moved.key, kept]
  if (kept !== before.kept) return [kept]
  const opened = keys.filter((key) => before.keys?.includes(key) === false)
  return opened.length === 1 ? [kept, opened[0]] : null
}

/**
 * Scrolls the kept tab back into view when `force` says so, or when it
 * changed its size or its place in the row since the last check, and notes
 * its place. A scroll of the user changes neither, so it stays.
 */
function keep(
  row: HTMLElement,
  nodes: TabNodes,
  seen: Seen,
  force: boolean,
): void {
  const kept = seen.kept ?? null
  const place = placeOf(row, nodes, kept)
  if (force || !samePlace(seen.place, place)) revealKeys(row, nodes, [kept])
  seen.place = place
}

/**
 * The scroll of a row of tabs that does not fit. The row keeps `kept`, the
 * tab with the rename field or else the shown tab, whole in view: at the
 * mount, when it changes, when the row gets narrower, and when that tab
 * changes its size or its place, such as after a rename, a new title, or a
 * close of a tab before it. A resize of the row or of a tab, and a render
 * that changes the tabs, check it. A scroll of the user away from the kept
 * tab stays until one of these. After a move, the moved tab shows. A tab
 * that opens shows too, as far as the kept tab still shows with it. A tab
 * that scrolls into view stops clear of the fades, at the scroll padding of
 * the row. It returns the ends of the row that clip tabs, which follow the
 * scroll position and the sizes of the row and its tabs.
 */
export function useRowScroll(props: {
  row: RefObject<HTMLElement | null>
  nodes: TabNodes
  keys: readonly string[]
  kept: string | null
  /** The last move, a new value for each move, and the key of its tab. */
  moved: { key: string } | null
}): RowFades {
  const { row, nodes } = props
  const [fades, setFades] = useState<RowFades>({ start: false, end: false })
  const seen = useRef<Seen>({
    keys: null,
    kept: undefined,
    moved: null,
    place: null,
  })
  const watcher = useRef<{ observer: ResizeObserver; tabs: Set<Element> }>(null)

  useLayoutEffect(() => {
    const node = row.current
    if (!node) return
    const update = () => {
      const next = fadesOf(node)
      setFades((last) =>
        last.start === next.start && last.end === next.end ? last : next,
      )
    }
    let width = node.clientWidth
    const observer = new ResizeObserver(() => {
      keep(node, nodes, seen.current, node.clientWidth < width)
      width = node.clientWidth
      update()
    })
    observer.observe(node)
    watcher.current = { observer, tabs: new Set() }
    node.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      watcher.current = null
      node.removeEventListener('scroll', update)
    }
  }, [row, nodes])

  // After each render: watch the new tabs, and scroll what changed into view.
  useLayoutEffect(() => {
    const node = row.current
    if (!node) return
    const watch = watcher.current
    if (watch) watchTabs(node, watch.observer, watch.tabs)
    const before = seen.current
    const { keys, kept, moved } = props
    const next: Seen = { keys, kept, moved, place: before.place }
    seen.current = next
    const shows = shownAfter(before, keys, kept, moved)
    if (shows) {
      revealKeys(node, nodes, shows)
      next.place = placeOf(node, nodes, kept)
    } else if (!sameKeys(before.keys, keys)) {
      // A tab that closed can move the kept tab.
      keep(node, nodes, next, false)
    }
  })

  return fades
}

/**
 * During a drag, the pointer at `x` near an end of the row, or past it,
 * scrolls the row at each frame, faster nearer the end, so that a drop can
 * reach every place. The drag finds its drop place again after each scroll.
 */
export function useEdgeScroll(
  row: RefObject<HTMLElement | null>,
  x: number | null,
): void {
  const pointer = useRef(x)
  useLayoutEffect(() => {
    pointer.current = x
  })
  const dragging = x !== null
  useEffect(() => {
    if (!dragging) return
    let frame = requestAnimationFrame(step)
    function step() {
      const node = row.current
      const at = pointer.current
      if (node && at !== null) {
        const box = node.getBoundingClientRect()
        const before = (box.left + edgeZone - at) / edgeZone
        const after = (at - box.right + edgeZone) / edgeZone
        const by = Math.max(before, after, 0)
        const speed = Math.ceil(edgeStep * Math.min(by, 1))
        if (speed > 0) node.scrollLeft += before > after ? -speed : speed
      }
      frame = requestAnimationFrame(step)
    }
    return () => cancelAnimationFrame(frame)
  }, [dragging, row])
}
