import {
  rightColumnWidth,
  sidebarWidth,
  type PanelWidth,
} from '../../docs/mockups/src/components/layout/ResizeHandle'
import type { KeyValueStorage } from './services'
import { Store } from './store'

export type Panel = 'sidebar' | 'right'

/** The default width and the range of each panel that the user drags. */
export const panelRanges: Readonly<Record<Panel, PanelWidth>> = {
  sidebar: sidebarWidth,
  right: rightColumnWidth,
}

const storageKeys: Readonly<Record<Panel, string>> = {
  sidebar: 'conducting.sidebar-width',
  right: 'conducting.right-width',
}

/** `null` means that the user has not chosen a width, so the layout's own applies. */
export type PanelState = Readonly<Record<Panel, number | null>>

/** A move of the edge of a panel: by some px, or to one end of its range. */
export type PanelMove = { by: number } | { to: 'min' | 'max' }

/** One drag of the edge of a panel. `by` is the change of the width. */
export interface PanelDrag {
  move(by: number): void
  /** Ends the drag at its last move. A second call changes nothing. */
  end(): void
}

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
 * The widths of the sidebar and the right column. The browser keeps them,
 * as the only state that does not come from the Worker. When the browser
 * refuses its storage, the widths last until the page closes.
 */
export class PanelWidths {
  readonly widths: Store<PanelState>
  private readonly storage: KeyValueStorage | null

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
    this.widths = new Store<PanelState>({
      sidebar: readWidth(storage, 'sidebar'),
      right: readWidth(storage, 'right'),
    })
  }

  /** The width now: the user's, or the default of the panel. */
  width(panel: Panel): number {
    return this.widths.get()[panel] ?? panelRanges[panel].value
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
    const before = this.widths.get()[panel]
    let last: number | null = null
    let ended = false
    return {
      move: (by) => {
        if (ended) return
        const width = this.next(panel, from, { by })
        last = width === Math.round(from) ? null : width
        this.put(panel, last ?? before)
      },
      end: () => {
        if (ended) return
        ended = true
        if (last === null) this.put(panel, before)
        else this.keep(panel, last)
      },
    }
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
