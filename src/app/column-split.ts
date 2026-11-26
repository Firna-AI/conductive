import { filesShare } from '../ui/components/layout/ResizeHandle'
import type { PanelDrag, PanelMove } from './panel-drag'
import type { KeyValueStorage } from './services'
import type { Readable } from './store'
import { StoredSize } from './stored-size'

const storageKey = 'conductive.files-share'

/** A share in its range, to a tenth of a percent. */
function inRange(share: number): number {
  const rounded = Math.round(share * 10) / 10
  return Math.min(filesShare.max, Math.max(filesShare.min, rounded))
}

/** Reads a share in percent, which comes back in its range. */
function readShare(stored: string): number | null {
  return /^\d+(\.\d+)?$/.test(stored) ? inRange(Number(stored)) : null
}

/**
 * The split of the right column between the file lists and the tools panel.
 * The share is the part of the file lists in percent, so the split keeps
 * its place when the window changes height. The browser keeps it as it
 * keeps the panel widths, through `StoredSize`. `null` means that the user
 * has not chosen a share, so the layout's own applies.
 */
export class ColumnSplit {
  readonly share: Readable<number | null>
  private readonly stored: StoredSize

  constructor(storage: KeyValueStorage | null) {
    this.stored = new StoredSize(storage, storageKey, readShare)
    this.share = this.stored.chosen
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
    this.stored.step(inRange(from), this.next(from, move))
  }

  /** One drag from `from`. `by` of each move is in percent. */
  drag(from: number): PanelDrag {
    return this.stored.drag(inRange(from), (by) => this.next(from, { by }))
  }
}
