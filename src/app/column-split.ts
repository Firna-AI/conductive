import { filesShare } from '../../docs/mockups/src/components/layout/ResizeHandle'
import { panelDrag, type PanelDrag, type PanelMove } from './panel-drag'
import type { KeyValueStorage } from './services'
import { Store } from './store'

const storageKey = 'conductive.files-share'

/** A share in its range, to a tenth of a percent. */
function inRange(share: number): number {
  const rounded = Math.round(share * 10) / 10
  return Math.min(filesShare.max, Math.max(filesShare.min, rounded))
}

function readShare(storage: KeyValueStorage | null): number | null {
  let stored: string | null
  try {
    stored = storage?.getItem(storageKey) ?? null
  } catch {
    return null
  }
  if (stored === null || !/^\d+(\.\d+)?$/.test(stored)) return null
  return inRange(Number(stored))
}

/**
 * The split of the right column between the file lists and the tools panel.
 * The share is the part of the file lists in percent, so the split keeps
 * its place when the window changes height. The browser keeps it as it
 * keeps the panel widths. `null` means that the user has not chosen a
 * share, so the layout's own applies.
 */
export class ColumnSplit {
  readonly share: Store<number | null>
  private readonly storage: KeyValueStorage | null

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage
    this.share = new Store(readShare(storage))
  }

  /** The share now: the user's, or the default. */
  value(): number {
    return this.share.get() ?? filesShare.value
  }

  /** The share after a move from `from`, in its range. */
  next(from: number, move: PanelMove): number {
    if ('by' in move) return inRange(from + move.by)
    return move.to === 'min' ? filesShare.min : filesShare.max
  }

  /** One step of the keys. A step that ends at `from` changes and stores nothing. */
  step(from: number, move: PanelMove): void {
    const share = this.next(from, move)
    if (share !== inRange(from)) this.keep(share)
  }

  /** One drag from `from`. `by` of each move is in percent. */
  drag(from: number): PanelDrag {
    return panelDrag({
      start: inRange(from),
      before: this.share.get(),
      next: (by) => this.next(from, { by }),
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
