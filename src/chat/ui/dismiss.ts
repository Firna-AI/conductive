import { useEffect, useRef, type RefObject } from 'react'
import { useMenuLayer } from '../../shell/ui/layers'

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
  useMenuLayer(open, close)
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
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Keeps Tab and Shift+Tab inside an open dialog or sheet: the focus wraps
 * from the last control to the first, and back.
 */
export function useFocusTrap(container: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const node = container.current
      if (event.key !== 'Tab' || !node) return
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (item) => item.tabIndex >= 0,
      )
      const first = items[0]
      const last = items.at(-1)
      const active = document.activeElement
      const inside = active instanceof Node && node.contains(active)
      if (!first || !last) {
        event.preventDefault()
      } else if (!inside) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [container])
}
