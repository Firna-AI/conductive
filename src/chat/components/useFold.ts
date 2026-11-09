import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type RefObject,
  type ToggleEvent,
} from 'react'

/**
 * Moves the chat by a distance in CSS pixels, as `scrollTop` counts it: a
 * positive distance moves the content up. `ChatPane` gives it. Outside a
 * chat, nothing moves.
 */
export const ChatScroll = createContext<(distance: number) => void>(() => {})

/** The props of a fold, a `<details>`, and of its line, its `<summary>`. */
export interface Fold {
  details: {
    open: boolean
    onToggle: (event: ToggleEvent<HTMLDetailsElement>) => void
  }
  line: {
    ref: RefObject<HTMLElement | null>
    onClickCapture: (event: MouseEvent<HTMLElement>) => void
  }
}

/**
 * Opens or closes a fold when the user clicks its line, and keeps the line
 * in place. The chat keeps its bottom in place, so a list that opens would
 * push its line up, out of view on a phone. So the click measures the line,
 * and after the render the chat moves by the distance that the line moved.
 * `open` and `setOpen` hold the state, which a toggle without a click, such
 * as a search in the page, also sets.
 *
 * The line takes the click in the capture phase. So it measures the line
 * and cancels the default toggle before any handler that runs while the
 * click bubbles, and the state alone opens or closes the fold.
 */
export function useFold(open: boolean, setOpen: (open: boolean) => void): Fold {
  const scroll = useContext(ChatScroll)
  const line = useRef<HTMLElement>(null)
  const before = useRef<number | null>(null)
  // Only the render after a click finds a top that the click measured.
  useLayoutEffect(() => {
    const top = before.current
    before.current = null
    if (top === null || line.current === null) return
    scroll(line.current.getBoundingClientRect().top - top)
  })
  return {
    details: {
      open,
      onToggle: (event) => {
        const shown = event.currentTarget.open
        if (shown !== open) setOpen(shown)
      },
    },
    line: {
      ref: line,
      onClickCapture: (event) => {
        event.preventDefault()
        before.current = line.current?.getBoundingClientRect().top ?? null
        setOpen(!open)
      },
    },
  }
}
