import type { PanelWidth } from '../ui/components/layout/ResizeHandle'
import { panelDrag, type PanelDrag } from './panel-drag'
import type { KeyValueStorage } from './services'
import { Store } from './store'

/**
 * The size that the text of the browser storage holds, or null when it
 * holds none, as each owner of a stored size reads its text.
 */
export type ReadSize = (stored: string) => number | null

/**
 * Reads a size in whole px, more than 0. A size over the range comes back
 * at the top of the range. A size under the range comes from a panel that
 * the layout showed smaller than its range, where the user chose it. It
 * comes back as it is.
 */
export function wholePx(range: PanelWidth): ReadSize {
  return (stored) => {
    if (!/^\d+$/.test(stored)) return null
    const size = Number(stored)
    return size === 0 ? null : Math.min(range.max, size)
  }
}

function readStored(
  storage: KeyValueStorage | null,
  key: string,
  read: ReadSize,
): number | null {
  let stored: string | null
  try {
    stored = storage?.getItem(key) ?? null
  } catch {
    return null
  }
  return stored === null ? null : read(stored)
}

/**
 * A size that the user chooses with a handle, such as the width of a
 * column, which the browser keeps under `key` for the next page load, as it
 * keeps the last workspaces of `last-workspaces.ts`. `chosen` is null until
 * the user chooses a size, so the default of its owner applies. When the
 * browser refuses its storage, a chosen size lasts until the page closes.
 * The owner gives the rule of each move. This class gives the rule of the
 * storage: a step or a drag that ends where it started changes and stores
 * nothing, and a drag shows each size at once and stores only its last.
 */
export class StoredSize {
  readonly chosen: Store<number | null>
  private readonly storage: KeyValueStorage | null
  private readonly key: string

  constructor(storage: KeyValueStorage | null, key: string, read: ReadSize) {
    this.storage = storage
    this.key = key
    this.chosen = new Store(readStored(storage, key, read))
  }

  /** Shows a size, and keeps it in the browser for the next page load. */
  choose(size: number): void {
    this.chosen.set(size)
    try {
      this.storage?.setItem(this.key, String(size))
    } catch {
      // The size still applies while the page stays open.
    }
  }

  /**
   * One step of the keys from `from`, the size that shows, to `to`. A step
   * that ends at `from` changes and stores nothing.
   */
  step(from: number, to: number): void {
    if (to !== from) this.choose(to)
  }

  /**
   * One drag from `from`, the size that shows. `next` gives the size after
   * a move by `by`. Each move shows its size at once, and the end stores the
   * last one. A drag that ends where it started gets back the size from
   * before the drag, and stores nothing.
   */
  drag(from: number, next: (by: number) => number): PanelDrag {
    return panelDrag({
      start: from,
      before: this.chosen.get(),
      next,
      put: (size) => this.chosen.set(size),
      keep: (size) => this.choose(size),
    })
  }
}
