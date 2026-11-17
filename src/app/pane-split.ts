import { panelDrag, type PanelDrag, type PanelMove } from './panel-drag'
import type { KeyValueStorage } from './services'
import { Store } from './store'

const storageKey = 'conductive.pane-share'

/** The least width of a pane that a drag of the divider keeps, in px. */
export const paneFloor = 320

/** The hairline between the two panes, the border of the left pane, in px. */
const hairline = 1

/** The share of the left pane while the user has chosen none, in percent. */
export const evenShare = 50

/** The range of the share of the left pane, in percent. */
export interface ShareRange {
  min: number
  max: number
}

/**
 * The range of a drag of the divider in a centre column `width` px wide:
 * each pane keeps at least 320 px. A column narrower than two such panes
 * and the hairline, 641 px, keeps the divider at half of the column.
 */
export function paneShareRange(width: number): ShareRange {
  if (width < 2 * paneFloor + hairline)
    return { min: evenShare, max: evenShare }
  return {
    min: (paneFloor / width) * 100,
    max: ((width - paneFloor - hairline) / width) * 100,
  }
}

/** A share to a tenth of a percent. */
function tenth(share: number): number {
  return Math.round(share * 10) / 10
}

function readShare(storage: KeyValueStorage | null): number | null {
  let stored: string | null
  try {
    stored = storage?.getItem(storageKey) ?? null
  } catch {
    return null
  }
  if (stored === null || !/^\d+(\.\d+)?$/.test(stored)) return null
  const share = Number(stored)
  return share > 0 && share < 100 ? tenth(share) : null
}

/**
 * The split of the two panes of the centre column: the share of the left
 * pane in the width of the column, in percent, so the split keeps its place
 * when the window changes width. The browser keeps it as it keeps the panel
 * widths. `null` means that the user has not chosen a share, so both panes
 * take half. The range of a move depends on the width of the column, as
 * `paneShareRange` says, so each move gets it.
 */
export class PaneSplit {
  readonly share: Store<number | null>
  private readonly storage: KeyValueStorage | null

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
    this.share = new Store(readShare(storage))
  }

  /** The share after a move from `from`, in `range`. */
  next(from: number, move: PanelMove, range: ShareRange): number {
    const target =
      'by' in move ? from + move.by : move.to === 'min' ? range.min : range.max
    return tenth(Math.min(range.max, Math.max(range.min, target)))
  }

  /** One step of the keys. A step that ends at `from` changes and stores nothing. */
  step(from: number, move: PanelMove, range: ShareRange): void {
    const share = this.next(from, move, range)
    if (share !== tenth(from)) this.keep(share)
  }

  /** One drag from `from`. `by` of each move is in percent of the column. */
  drag(from: number, range: ShareRange): PanelDrag {
    return panelDrag({
      start: tenth(from),
      before: this.share.get(),
      next: (by) => this.next(from, { by }, range),
      put: (share) => this.share.set(share),
      keep: (share) => this.keep(share),
    })
  }

  /** Shows a share, and keeps it in the browser for the next page load. */
  private keep(share: number): void {
    this.share.set(share)
    try {
      this.storage?.setItem(storageKey, String(share))
    } catch {
      // The share still applies while the page stays open.
    }
  }
}
