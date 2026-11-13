import {
  rightColumnWidth,
  sidebarWidth,
  type PanelWidth,
} from '../../docs/mockups/src/components/layout/ResizeHandle'
import { ColumnSplit } from './column-split'
import { panelDrag, type PanelDrag, type PanelMove } from './panel-drag'
import type { KeyValueStorage } from './services'
import { Store } from './store'

export type { PanelDrag, PanelMove } from './panel-drag'

export type Panel = 'sidebar' | 'right'

/** The default width and the range of each panel that the user drags. */
export const panelRanges: Readonly<Record<Panel, PanelWidth>> = {
  sidebar: sidebarWidth,
  right: rightColumnWidth,
}

const storageKeys: Readonly<Record<Panel, string>> = {
  sidebar: 'conductive.sidebar-width',
  right: 'conductive.right-width',
}

/** `null` means that the user has not chosen a width, so the layout's own applies. */
export type PanelState = Readonly<Record<Panel, number | null>>

function readWidth(storage: KeyValueStorage | null, panel: Panel) {
  let stored: string | null
  try {
    stored = storage?.getItem(storageKeys[panel]) ?? null
  } catch {
    return null
  }
  if (stored === null || !/^\d+$/.test(stored)) return null
  const width = Number(stored)
  if (width === 0) return null
  // A width under the range comes from a panel that the layout showed
  // narrower than its range, where the user chose it. It comes back as it is.
  return Math.min(panelRanges[panel].max, width)
}

/**
 * The layout of the panels that the user chooses: the widths of the
 * sidebar and the right column, the split of the right column between the
 * file lists and the tools, and whether the right column shows. The
 * browser keeps the widths and the split, as it keeps the last workspaces
 * of `last-workspaces.ts`. When the browser refuses its storage, they last
 * until the page closes. Whether the right column shows always lasts until
 * the page closes.
 */
export class PanelLayout {
  readonly widths: Store<PanelState>
  /**
   * The right column shows. The toggle at the end of the workspace header
   * hides it and shows it again, for every workspace of the tab.
   */
  readonly rightShown = new Store(true)
  /** The split of the right column between the file lists and the tools. */
  readonly split: ColumnSplit
  private readonly storage: KeyValueStorage | null

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
    this.split = new ColumnSplit(storage)
    this.widths = new Store<PanelState>({
      sidebar: readWidth(storage, 'sidebar'),
      right: readWidth(storage, 'right'),
    })
  }

  /** The width now: the user's, or the default of the panel. */
  width(panel: Panel): number {
    return this.widths.get()[panel] ?? panelRanges[panel].value
  }

  /** Hides the right column, or shows it again. */
  toggleRight = (): void => {
    this.rightShown.change((shown) => !shown)
  }

  /**
   * The width after a move from `from`, the width that the panel shows. The
   * width stays in a range that holds `from`: the range of the panel,
   * widened to `from` when the layout shows the panel outside it. So a
   * shrink never widens a panel, and Home and End go to the ends of that
   * range. The keys and the drag all use this one rule.
   */
  next(panel: Panel, from: number, move: PanelMove): number {
    const range = panelRanges[panel]
    const shown = Math.round(from)
    const low = Math.min(range.min, shown)
    const high = Math.max(range.max, shown)
    const target =
      'by' in move ? shown + move.by : move.to === 'min' ? low : high
    return Math.min(high, Math.max(low, Math.round(target)))
  }

  /** One step of the keys. A step that ends at `from` changes and stores nothing. */
  step(panel: Panel, from: number, move: PanelMove): void {
    const width = this.next(panel, from, move)
    if (width !== Math.round(from)) this.keep(panel, width)
  }

  /**
   * One drag from `from`. Each move shows its width at once, and the end
   * stores the last one. A drag that ends where it started gets back the
   * width from before the drag, and stores nothing.
   */
  drag(panel: Panel, from: number): PanelDrag {
    return panelDrag({
      start: Math.round(from),
      before: this.widths.get()[panel],
      next: (by) => this.next(panel, from, { by }),
      put: (width) => this.put(panel, width),
      keep: (width) => this.keep(panel, width),
    })
  }

  private put(panel: Panel, width: number | null): void {
    if (this.widths.get()[panel] === width) return
    this.widths.change((current) => ({ ...current, [panel]: width }))
  }

  /** Shows a width, and keeps it in the browser for the next page load. */
  private keep(panel: Panel, width: number): void {
    this.put(panel, width)
    try {
      this.storage?.setItem(storageKeys[panel], String(width))
    } catch {
      // The width still applies while the page stays open.
    }
  }
}
