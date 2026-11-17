import { borderOf, type DropPlace, type DropRow } from './tab-drop'
import type { ElementRefs, TabNodes } from './tab-nodes'
import { rowKey } from './tab-row'

/** What the drag of a column reads to find a drop place. */
export interface DropArea {
  rows: readonly DropRow[]
  /** The elements of the tabs of the column, by key. */
  nodes: TabNodes
  /** The content under each row, by the index of the row as a string. */
  contents: ElementRefs
  /** The saved view holds two panes. */
  split: boolean
}

const stay: DropPlace = { kind: 'stay' }

/** Whether the point is inside a box that the page laid out. */
function inside(box: DOMRect, x: number, y: number): boolean {
  return (
    box.width > 0 &&
    box.height > 0 &&
    x >= box.left &&
    x < box.right &&
    y >= box.top &&
    y < box.bottom
  )
}

/** How far `x` is beside a box: 0 over it. A box with no width is never near. */
function distance(box: DOMRect | undefined, x: number): number {
  if (!box || box.width === 0) return Infinity
  return Math.max(box.left - x, 0, x - box.right)
}

/**
 * The pane of the place at `index` among the other tabs of a row. A row of
 * one pane gives its pane. In the one row of a phone, the place between the
 * two parts goes to the left part when the pointer is left of the line
 * between them, else to the right part. Without the boxes of the tabs, it
 * goes to the pane of the tab.
 */
function paneAt(
  row: DropRow,
  key: string,
  index: number,
  x: number,
  nodes: TabNodes,
): 0 | 1 {
  const { tabs } = row
  const left = row.pane ?? tabs[0]?.pane ?? 0
  const border = borderOf(tabs)
  if (border === null) return left
  const right = tabs[border].pane
  const leftKeys = tabs.slice(0, border).map(rowKey)
  const gap = leftKeys.includes(key) ? border - 1 : border
  if (index !== gap) return index < gap ? left : right
  const end = nodes.item(leftKeys[border - 1])?.getBoundingClientRect()
  const start = nodes.item(rowKey(tabs[border]))?.getBoundingClientRect()
  if (!end || !start) return leftKeys.includes(key) ? left : right
  return x < (end.right + start.left) / 2 ? left : right
}

/**
 * The drop place of a drop on the content under the row at `at`. With two
 * panes, the content of the other pane takes the tab at the end of its row.
 * With one pane, a half of it opens a new pane on that side, unless the tab
 * is the only tab of the row. The content of the tab's own pane, and the
 * chat of a phone, take no drop.
 */
function contentPlace(
  area: DropArea,
  at: number,
  key: string,
  x: number,
  box: DOMRect,
): DropPlace {
  const { pane } = area.rows[at]
  const source = area.rows.find((row) =>
    row.tabs.some((tab) => rowKey(tab) === key),
  )
  const tab = source?.tabs.find((item) => rowKey(item) === key)
  if (pane === null || !source || !tab) return stay
  if (area.split) return pane === tab.pane ? stay : { kind: 'pane', pane }
  if (source.tabs.length < 2) return stay
  return { kind: 'half', side: x < box.left + box.width / 2 ? 'left' : 'right' }
}

/**
 * The drop place of the dragged tab with `key` under the point. Over the
 * content under a row, the content decides, as `contentPlace` says.
 * Elsewhere, the place is in the row whose content is nearest beside the
 * point, else in the row of the tab: before the first other tab whose
 * middle is right of the point, else after the last one.
 */
export function locateDrop(
  area: DropArea,
  key: string,
  x: number,
  y: number,
): DropPlace {
  const { rows, nodes } = area
  const source = rows.findIndex((row) =>
    row.tabs.some((tab) => rowKey(tab) === key),
  )
  if (source < 0) return stay
  const boxes = rows.map((_, at) =>
    area.contents.get(String(at))?.getBoundingClientRect(),
  )
  for (const [at, box] of boxes.entries()) {
    if (box && inside(box, x, y)) return contentPlace(area, at, key, x, box)
  }
  let at = source
  for (const [index, box] of boxes.entries()) {
    if (distance(box, x) < distance(boxes[at], x)) at = index
  }
  const row = rows[at]
  const index = nodes.placeAt(row.tabs.map(rowKey), key, x)
  return {
    kind: 'row',
    row: at,
    index,
    pane: paneAt(row, key, index, x, nodes),
  }
}
