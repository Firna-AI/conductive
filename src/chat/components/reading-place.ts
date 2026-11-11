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

/** A row to keep in place, its top then, and the rows above it then. */
interface Kept {
  row: Element
  top: number
  above: readonly Element[]
}

const topOf = (element: Element) => element.getBoundingClientRect().top
const heightOf = (element: Element) => element.getBoundingClientRect().height

/**
 * The reversed box counts its scroll position up to 0 at the bottom. A
 * pixel of rounding still counts as the bottom.
 */
const atBottom = (scroller: HTMLElement) => scroller.scrollTop >= -1

/**
 * Keeps the row that the reader reads in place for every change of size of
 * the transcript. The chat scrolls in a box that keeps its bottom in place,
 * and a browser keeps the read row only while the old distance from the
 * bottom fits the new range. So at each scroll, while the reader is scrolled
 * up, the keeper notes the top row in view. After each change of size, it
 * moves the chat by the distance that this row moved, which is zero where
 * the browser kept the row. At the bottom it notes no row, so the newest
 * message stays in view.
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
   * size waits for `settle`, the row noted before it stays.
   */
  note(): void {
    if (heightOf(this.transcript) !== this.height) return
    this.kept = atBottom(this.scroller) ? null : this.topRow()
  }

  keep(row: Element): void {
    this.kept = { row, top: topOf(row), above: [] }
  }

  settle(): void {
    const kept = this.kept
    const row = kept?.row.isConnected ? kept.row : this.successor(kept)
    if (kept && row) this.scroller.scrollTop += topOf(row) - kept.top
    this.height = heightOf(this.transcript)
    this.note()
  }

  /**
   * Moves the chat to its bottom and forgets the noted row, so that the next
   * `settle` keeps the bottom in view.
   */
  toBottom(): void {
    this.scroller.scrollTop = 0
    this.kept = null
  }

  /** A size changed: the transcript's, which settles, or the box's. */
  resized(): void {
    if (heightOf(this.transcript) !== this.height) this.settle()
    else this.note()
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
    return row ? { row, top: topOf(row), above: rows.slice(0, low) } : null
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
 * `ResizeObserver` sees in `transcript` or in `scroller`. `shown` says
 * whether the chat shows its transcript. `newest` names the newest user
 * message. When it changes to another message, the chat moves to its
 * bottom, also while the reader is scrolled up, so that the new message
 * shows.
 */
export function useReadingPlace(
  scroller: RefObject<HTMLElement | null>,
  transcript: RefObject<HTMLElement | null>,
  shown: boolean,
  newest: string | null,
): RowKeeper {
  const place = useRef<ReadingPlace | null>(null)
  const shownNewest = useRef(newest)
  useLayoutEffect(() => {
    const box = scroller.current
    const rows = transcript.current
    if (!shown || !box || !rows) return
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
  // After the effect above, so that a transcript that just showed has its keeper.
  useLayoutEffect(() => {
    if (shownNewest.current === newest) return
    shownNewest.current = newest
    if (newest !== null) place.current?.toBottom()
  }, [newest])
  return useMemo(
    () => ({
      keep: (row: Element) => place.current?.keep(row),
      settle: () => place.current?.settle(),
    }),
    [],
  )
}
