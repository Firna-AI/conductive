import {
  popoverHeight,
  popoverWidth,
} from '../ui/components/explain/popoverSize'
import {
  moveInRange,
  panelDrag,
  type PanelDrag,
  type PanelMove,
} from './panel-drag'
import type { KeyValueStorage } from './services'
import { Store } from './store'
import { StoredSize, wholePx } from './stored-size'

/** The width or the highest height of the Explain popover. */
export type PopoverAxis = 'width' | 'height'

const ranges = { width: popoverWidth, height: popoverHeight } as const

/**
 * The size of the Explain popovers of a computer that the member chose with
 * their handles: one width and one highest height for all popovers. The
 * browser keeps it, as it keeps the column widths, so the next long answer
 * opens at that size. `null` means the default, 400 px by 420 px.
 */
export class ExplainSize {
  readonly width: StoredSize
  readonly height: StoredSize

  constructor(storage: KeyValueStorage | null) {
    this.width = new StoredSize(
      storage,
      'conductive.explain-width',
      wholePx(popoverWidth),
    )
    this.height = new StoredSize(
      storage,
      'conductive.explain-height',
      wholePx(popoverHeight),
    )
  }
}

/**
 * The size that one open popover moved to with its handles, or null where
 * it takes the chosen size.
 */
export type MovedSize = Readonly<Record<PopoverAxis, number | null>>

/**
 * The size of one open popover and the moves of its handles. Each move
 * starts from `from`, the size that the panel shows, and stops at `room`,
 * the room for the panel on its side of the mark. From its first move until
 * the popover closes, the popover keeps the moved size in `moved`. So the
 * panel keeps the moved height also over a short chat, and its edge follows
 * the pointer. Each step of a key and the end of each drag also become the
 * chosen size of `ExplainSize`, for the next popovers. A drag that ends
 * where it started stores nothing, and the panel shows as before it.
 */
export class PopoverSize {
  readonly moved = new Store<MovedSize>({ width: null, height: null })
  private readonly chosen: ExplainSize

  constructor(chosen: ExplainSize) {
    this.chosen = chosen
  }

  /**
   * The size that the panel takes before the room caps it: the moved one,
   * the chosen one, or the default.
   */
  size(axis: PopoverAxis): number {
    return (
      this.moved.get()[axis] ??
      this.chosen[axis].chosen.get() ??
      ranges[axis].value
    )
  }

  /**
   * The size after a move from `from`, in a range that holds `from`, up to
   * `room`, as `moveInRange` says. A grow from a panel that shows smaller
   * than its range, such as over a short answer, goes at least to the
   * smallest size of the range, or to the room where the room is smaller.
   */
  next(axis: PopoverAxis, from: number, move: PanelMove, room: number) {
    const size = moveInRange(ranges[axis], from, move, room)
    if (size <= Math.round(from)) return size
    return Math.max(size, Math.min(ranges[axis].min, Math.floor(room)))
  }

  /** One step of the keys. A step that ends at `from` changes and stores nothing. */
  step(axis: PopoverAxis, from: number, move: PanelMove, room: number): void {
    const size = this.next(axis, from, move, room)
    if (size !== Math.round(from)) this.keep(axis, size)
  }

  /** One drag from `from`. Each move shows its size at once. */
  drag(axis: PopoverAxis, from: number, room: number): PanelDrag {
    return panelDrag({
      start: Math.round(from),
      before: this.moved.get()[axis],
      next: (by) => this.next(axis, from, { by }, room),
      put: (size) => this.show(axis, size),
      keep: (size) => this.keep(axis, size),
    })
  }

  private show(axis: PopoverAxis, size: number | null): void {
    this.moved.change((moved) =>
      moved[axis] === size ? moved : { ...moved, [axis]: size },
    )
  }

  /**
   * Shows a size, and makes it the chosen size of all popovers. The chosen
   * size stays in the range, also where a small room capped the move.
   */
  private keep(axis: PopoverAxis, size: number): void {
    this.show(axis, size)
    this.chosen[axis].choose(Math.max(size, ranges[axis].min))
  }
}
