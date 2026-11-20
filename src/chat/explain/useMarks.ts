import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react'
import { Store, useStore } from '../../app/store'
import type { MenuPoint } from '../ui/Menu'
import type { Explanation } from './explanations'
import { setHighlights } from './highlights'
import {
  applyMarks,
  emptyLayout,
  ownChange,
  undoMarks,
  type MarkLayout,
  type PlacedMark,
} from './mark-layout'

/** What places a mark: its explanation and its anchor, not its state. */
function placeKey(marks: readonly Explanation[]): string {
  return JSON.stringify(
    marks.map(({ id, anchor }) => [
      id,
      anchor.quote,
      anchor.before,
      anchor.after,
    ]),
  )
}

/**
 * Finds the marks of a message in the text that it shows, and finds them
 * again after each change of that text, such as a chip that loads, until
 * the anchors change or the message goes. Each change of the page that is
 * not a part of Explain lays the marks out again. A new state or title of
 * an explanation keeps the layout, so the button of its state keeps the
 * focus: the layout names each explanation, and the caller draws its
 * newest record.
 */
export function useMarks(
  root: RefObject<HTMLElement | null>,
  marks: readonly Explanation[],
  slotClass: string,
): MarkLayout {
  const [store] = useState(() => new Store<MarkLayout>(emptyLayout))
  const layout = useStore(store)
  const key = placeKey(marks)
  // The marks lay out again only when what places them changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const placed = useMemo(() => marks, [key])
  useLayoutEffect(() => {
    const node = root.current
    if (!node || placed.length === 0) return undefined
    let applied = applyMarks(node, placed, slotClass)
    store.set(applied.layout)
    const observer = new MutationObserver((records) => {
      if (records.every(ownChange)) return
      observer.disconnect()
      undoMarks(applied)
      applied = applyMarks(node, placed, slotClass)
      observer.takeRecords()
      observe()
      store.set(applied.layout)
    })
    const observe = () =>
      observer.observe(node, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    observe()
    return () => {
      observer.disconnect()
      undoMarks(applied)
    }
  }, [root, placed, slotClass, store])
  return placed.length === 0 ? emptyLayout : layout
}

/** Whether a point of the window lies on a rectangle. */
function contains(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

/** The marks whose text lies under a point of the window. */
export function marksAt(
  placed: readonly PlacedMark[],
  x: number,
  y: number,
): PlacedMark[] {
  return placed.filter(({ range }) =>
    [...range.getClientRects()].some((rect) => contains(rect, x, y)),
  )
}

/**
 * Where the menu of overlapping marks opens: under the line of the overlap
 * at the point, from its start, as the mockups draw it.
 */
export function overlapPoint(
  overlaps: readonly Range[],
  x: number,
  y: number,
): MenuPoint {
  for (const range of overlaps) {
    const line = [...range.getClientRects()].find((rect) =>
      contains(rect, x, y),
    )
    if (line) return { x: line.left, y: line.bottom + 4 }
  }
  return { x, y: y + 12 }
}

/**
 * The marks under the pointer, which the fill deepens and whose titles the
 * tooltip of the message shows. A press opens their popover or their menu.
 */
export function useMarkHover(placed: readonly PlacedMark[]) {
  const [hovered, setHovered] = useState<readonly string[]>([])
  const update = (ids: readonly string[]) =>
    setHovered((current) =>
      current.length === ids.length &&
      current.every((id, index) => id === ids[index])
        ? current
        : ids,
    )
  return {
    hovered,
    onPointerMove: (event: PointerEvent<HTMLElement>) =>
      update(
        marksAt(placed, event.clientX, event.clientY).map(
          (item) => item.mark.id,
        ),
      ),
    onPointerLeave: () => update([]),
  }
}

/**
 * Draws the fill of the marks of a message: each mark, the overlaps, the
 * marks under the pointer, and the mark whose popover is open.
 */
export function useMarkHighlights(
  layout: MarkLayout,
  hovered: readonly string[],
  open: string | null,
): void {
  const [owner] = useState(() => ({}))
  useEffect(() => {
    if (layout.placed.length === 0) {
      setHighlights(owner, null)
      return undefined
    }
    const rangesOf = (keep: (mark: Explanation) => boolean) =>
      layout.placed.filter(({ mark }) => keep(mark)).map(({ range }) => range)
    setHighlights(owner, {
      mark: rangesOf(() => true),
      overlap: layout.overlaps,
      hover: rangesOf((mark) => hovered.includes(mark.id)),
      active: rangesOf((mark) => mark.id === open),
    })
    return () => setHighlights(owner, null)
  }, [owner, layout, hovered, open])
}
