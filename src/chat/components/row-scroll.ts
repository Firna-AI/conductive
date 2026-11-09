import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
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

/**
 * Scrolls the row as little as it can, so that the tabs show whole, clear
 * of the scroll padding of the row: the first tab first, then each next tab
 * as far as it still shows with the ones before it. A first tab wider than
 * the row shows its start.
 */
function reveal(row: HTMLElement, tabs: readonly HTMLElement[]): void {
  const style = getComputedStyle(row)
  const padStart = parseFloat(style.scrollPaddingInlineStart) || 0
  const padEnd = parseFloat(style.scrollPaddingInlineEnd) || 0
  const max = Math.max(0, row.scrollWidth - row.clientWidth)
  const clamp = (value: number) => Math.min(Math.max(value, 0), max)
  // The left side of the content of the row, in CSS px of the window.
  const origin =
    row.getBoundingClientRect().left + row.clientLeft - row.scrollLeft
  let low = 0
  let high = max
  for (const [index, tab] of tabs.entries()) {
    const box = tab.getBoundingClientRect()
    const start = box.left - origin
    const to = clamp(start - padStart)
    let from = clamp(start + box.width + padEnd - row.clientWidth)
    if (from > to) {
      if (index > 0) break
      from = to
    }
    if (Math.max(low, from) > Math.min(high, to)) break
    low = Math.max(low, from)
    high = Math.min(high, to)
  }
  const left = Math.min(Math.max(row.scrollLeft, low), high)
  if (Math.abs(left - row.scrollLeft) >= 1) row.scrollLeft = left
}

/** Scrolls the row so that the tabs of the keys show, as `reveal` says. */
function revealKeys(
  row: HTMLElement,
  nodes: TabNodes,
  keys: readonly (string | null)[],
): void {
  const tabs = keys.flatMap((key) => {
    const item = key === null ? undefined : nodes.item(key)
    return item ? [item] : []
  })
  if (tabs.length > 0) reveal(row, tabs)
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

/** What the row remembers of its last render. */
interface Seen {
  keys: readonly string[] | null
  kept: string | null | undefined
  moved: object | null
}

/**
 * The scroll of a row of tabs that does not fit. The row keeps `kept`, the
 * tab with the rename field or else the shown tab, in view: at the mount,
 * when it changes, and when the row gets narrower. After a move, the moved
 * tab shows. A tab that opens shows too, as far as the kept tab still shows
 * with it. A tab that scrolls into view stops clear of the fades, at the
 * scroll padding of the row. It returns the ends of the row that clip tabs,
 * which follow the scroll position and the sizes of the row and its tabs.
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
  const seen = useRef<Seen>({ keys: null, kept: undefined, moved: null })
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
      const kept = seen.current.kept ?? null
      if (node.clientWidth < width) revealKeys(node, nodes, [kept])
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
    seen.current = { keys, kept, moved }
    const opened = keys.filter((key) => before.keys?.includes(key) === false)
    if (moved !== null && moved !== before.moved) {
      revealKeys(node, nodes, [moved.key, kept])
    } else if (kept !== before.kept) revealKeys(node, nodes, [kept])
    else if (opened.length === 1) revealKeys(node, nodes, [kept, opened[0]])
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
