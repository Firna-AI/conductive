import {
  useContext,
  useLayoutEffect,
  useRef,
  type MouseEvent,
  type RefObject,
  type ToggleEvent,
} from 'react'
import { ChatKeeper } from './reading-place'

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
 * The click ends a selection of text in the line, such as a drag over the
 * text of an open message line, so the fold keeps its state.
 */
function selectsText(line: HTMLElement): boolean {
  const selection = document.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return false
  return selection.getRangeAt(0).intersectsNode(line)
}

/**
 * Opens or closes a fold when the user clicks its line, and keeps the line
 * in place. The click gives the line to the keeper of the chat as the row to
 * keep, also at the bottom of the chat. After the render, the keeper moves
 * the chat by the distance that the line moved, as it does for every change
 * of size. `open` and `setOpen` hold the state, which a toggle without a
 * click, such as a search in the page, also sets.
 *
 * The line takes the click in the capture phase. So it measures the line
 * and cancels the default toggle before any handler that runs while the
 * click bubbles, and the state alone opens or closes the fold. A click on a
 * link in the line, such as a workspace chip in a message, stays with the
 * link, so a click with a modifier key opens a new tab as on any link.
 * A click that ends a selection of text in the line keeps the fold as it
 * is, so the text of an open message line can be selected.
 */
export function useFold(open: boolean, setOpen: (open: boolean) => void): Fold {
  const keeper = useContext(ChatKeeper)
  const line = useRef<HTMLElement>(null)
  const clicked = useRef(false)
  // Only the render after a click settles the line that the click kept.
  useLayoutEffect(() => {
    if (!clicked.current) return
    clicked.current = false
    keeper.settle()
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
        const link =
          event.target instanceof Element
            ? event.target.closest('a[href]')
            : null
        if (link && event.currentTarget.contains(link)) return
        event.preventDefault()
        if (selectsText(event.currentTarget)) return
        if (line.current) keeper.keep(line.current)
        clicked.current = true
        setOpen(!open)
      },
    },
  }
}
