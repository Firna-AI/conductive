import {
  createContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'

/** What a part of the chat asks of the keeper of the reader's place. */
export interface RowKeeper {
  /**
   * Keeps this row in place through the next `settle`, also at the bottom
   * of the chat, such as the line of a fold that the user toggles.
   */
  keep(row: Element): void
  /** Moves the chat by the distance that the kept row moved since then. */
  settle(): void
}

/** The keeper of the chat, which `ChatPane` gives. Outside a chat, nothing moves. */
export const ChatKeeper = createContext<RowKeeper>({
  keep: () => {},
  settle: () => {},
})

/**
 * A row to keep in place: its top then, the scroll position then, and the
 * rows above it then.
 */
interface Kept {
  row: Element
  top: number
  at: number
  above: readonly Element[]
}

const topOf = (element: Element) => element.getBoundingClientRect().top
const heightOf = (element: Element) => element.getBoundingClientRect().height

/**
 * The reversed box counts its scroll position up to 0 at the bottom. A
 * pixel of rounding still counts as the bottom, on either side of 0.
 */
const atBottom = (scroller: HTMLElement) => scroller.scrollTop >= -1

/**
 * Keeps the row that the reader reads in place for every change of size of
 * the transcript. The chat scrolls in a box that keeps its bottom in place,
 * and a browser keeps the read row only while the old distance from the
 * bottom fits the new range. So at each scroll, while the reader is scrolled
 * up, the keeper notes the top row in view. After each change of size, it
 * moves the chat by the distance that this row moved in the transcript, so
 * a scroll of the reader since the note stays. At the bottom it notes no
 * row, so the newest message stays in view.
 *
 * The keeper does the work of the browser's scroll anchoring, so the box
 * of `ChatPane` turns that off. With both, a row would move twice. Also, a
 * box can scroll a pixel past its bottom, and there the browser's anchoring
 * moves the newest message out of view when the transcript grows.
 */
class ReadingPlace implements RowKeeper {
  private readonly scroller: HTMLElement
  private readonly transcript: HTMLElement
  private kept: Kept | null = null
  /** The height of the transcript at the last `settle`. */
  private height: number

  constructor(scroller: HTMLElement, transcript: HTMLElement) {
    this.scroller = scroller
    this.transcript = transcript
    this.height = heightOf(transcript)
    this.note()
  }

  /**
   * Notes the top row in view, or no row at the bottom. While a change of
   * size waits for `settle`, the row noted before it stays, because a
   * browser can move the chat for that change before `settle`. Only a
   * scroll of the reader, or a transcript that fits the box, gets to the
   * bottom then, so the bottom still counts.
   */
  note(): void {
    if (atBottom(this.scroller)) this.kept = null
    else if (heightOf(this.transcript) === this.height) {
      this.kept = this.topRow()
    }
  }

  keep(row: Element): void {
    const at = this.scroller.scrollTop
    this.kept = { row, top: topOf(row), at, above: [] }
  }

  settle(): void {
    const kept = this.kept
    const row = kept?.row.isConnected ? kept.row : this.successor(kept)
    const distance = kept && row ? this.distance(kept, row) : 0
    if (distance !== 0) this.scroller.scrollTop += distance
    this.height = heightOf(this.transcript)
    this.note()
  }

  /** A size changed: the transcript's, which settles, or the box's. */
  resized(): void {
    if (heightOf(this.transcript) !== this.height) this.settle()
    else this.note()
  }

  /**
   * The distance that the row moved in the transcript since the note, which
   * the chat moves to keep the row. A scroll since then moved the row in the
   * box, but not in the transcript, so it stays. When the old position no
   * longer fits the shorter range, the browser moved the chat to its top
   * for the change, and the row goes back to its old place in the box.
   */
  private distance(kept: Kept, row: Element): number {
    const position = this.scroller.scrollTop
    const inBox = topOf(row) - kept.top
    // The position that shows the top of the transcript: the end of the range.
    const top = position + topOf(this.transcript) - topOf(this.scroller)
    return kept.at < top - 1 ? inBox : inBox + position - kept.at
  }

  /** The first row of the transcript whose bottom shows in the box. */
  private topRow(): Kept | null {
    const rows = Array.from(this.transcript.children)
    const edge = topOf(this.scroller)
    let [low, high] = [0, rows.length]
    while (low < high) {
      const middle = Math.floor((low + high) / 2)
      if (rows[middle].getBoundingClientRect().bottom > edge) high = middle
      else low = middle + 1
    }
    const row = rows.at(low)
    if (!row) return null
    const at = this.scroller.scrollTop
    return { row, top: topOf(row), at, above: rows.slice(0, low) }
  }

  /**
   * The row that took the place of a kept row that left the transcript,
   * such as the fold that took the work of an ended turn: the row after the
   * nearest row above it that stays.
   */
  private successor(kept: Kept | null): Element | null {
    const stays = kept?.above.findLast(
      (row) => row.parentElement === this.transcript,
    )
    return stays?.nextElementSibling ?? null
  }
}

/**
 * The keeper of the reader's place in a chat. It notes the read row at each
 * scroll of `scroller`, and settles after each change of size that a
 * `ResizeObserver` sees in `transcript` or in `scroller`. `shown` names the
 * transcript that the boxes show, such as that of a session, or is null
 * while the chat shows none. A new name starts the keeper again on the
 * boxes of the new transcript.
 */
export function useReadingPlace(
  scroller: RefObject<HTMLElement | null>,
  transcript: RefObject<HTMLElement | null>,
  shown: string | null,
): RowKeeper {
  const place = useRef<ReadingPlace | null>(null)
  useLayoutEffect(() => {
    const box = scroller.current
    const rows = transcript.current
    if (shown === null || !box || !rows) return
    const current = new ReadingPlace(box, rows)
    const note = () => current.note()
    const observer = new ResizeObserver(() => current.resized())
    box.addEventListener('scroll', note, { passive: true })
    observer.observe(rows)
    observer.observe(box)
    place.current = current
    return () => {
      place.current = null
      observer.disconnect()
      box.removeEventListener('scroll', note)
    }
  }, [scroller, transcript, shown])
  return useMemo(
    () => ({
      keep: (row: Element) => place.current?.keep(row),
      settle: () => place.current?.settle(),
    }),
    [],
  )
}
