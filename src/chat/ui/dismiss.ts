import { useEffect, useRef, type RefObject } from 'react'
import { useMenuLayer } from '../../shell/ui/layers'
import { useLostFocus } from '../../shell/ui/lost-focus'
import {
  controlsOf,
  keepTabInside,
  tabWithScrollingBody,
} from '../../shell/ui/tab-stops'

/** Calls `close` when the user presses Escape. */
export function useEscape(close: () => void, active = true): void {
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, close])
}

/**
 * Closes an open menu on Escape, and on a press outside its anchor: the
 * wrapper of the menu and the button that opens it. The key of the command
 * palette of the app closes it too.
 */
export function useDismiss(
  anchor: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
): void {
  useEscape(close, open)
  useMenuLayer(open, () => {
    close()
    return true
  })
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const node = anchor.current
      if (
        node &&
        event.target instanceof Node &&
        !node.contains(event.target)
      ) {
        close()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [anchor, open, close])
}

/**
 * Moves the focus into a part when it opens, and back to where it was when
 * it closes, so the keyboard stays where the user works. The element to go
 * back to is kept once, so an effect that runs twice keeps the first one.
 * While the part shows, a render that takes away the element with the
 * focus gives the focus back to `first`, as `useLostFocus` says.
 */
export function useFocusInside(
  part: RefObject<HTMLElement | null>,
  first: (node: HTMLElement) => HTMLElement | null,
): void {
  const previous = useRef<Element | null>(null)
  useEffect(() => {
    previous.current ??= document.activeElement
    const node = part.current
    if (node && !node.contains(document.activeElement)) first(node)?.focus()
    return () => {
      const back = previous.current
      const lost =
        document.activeElement === null ||
        document.activeElement === document.body
      if (lost && back instanceof HTMLElement) back.focus()
    }
    // The part focuses once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useLostFocus(part, first)
}

/**
 * Keeps Tab and Shift+Tab inside an open dialog or sheet: the focus wraps
 * from the last control to the first, and back. From an element that is no
 * control, such as a body that does not scroll, Tab goes to the first
 * control and Shift+Tab to the last, as `keepTabInside` says. `body` is the
 * box of a dialog that scrolls its content. While it scrolls text without
 * a control, it is a stop too, as `tabWithScrollingBody` says.
 */
export function useFocusTrap(
  container: RefObject<HTMLElement | null>,
  body?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const node = container.current
      if (event.key !== 'Tab' || !node) return
      const items = controlsOf(node)
      if (tabWithScrollingBody(event, items, body?.current ?? null)) return
      keepTabInside(event, items, document.activeElement)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [container, body])
}
