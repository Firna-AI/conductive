import { useEffect } from 'react'
import { useLatest } from '../components/chip-field/use-latest'

/** The presses that keep the open popover, as `keepPopover` says. */
const kept = new WeakSet<Event>()

/**
 * Keeps the open popover at a press: a press in the popover, also in a part
 * that it opens over the page, such as a menu, or a press on a mark, which
 * opens its own popover or menu. React gives each such press to the part
 * before the document hears it, also from a portal.
 */
export function keepPopover(event: Event): void {
  kept.add(event)
}

/**
 * Calls `close` at a press outside the popover, while `active`. A press
 * that `keepPopover` keeps closes nothing. A press counts as the pointer
 * goes down, as for the other panels of the app.
 */
export function usePressOutside(active: boolean, close: () => void): void {
  const latest = useLatest(close)
  useEffect(() => {
    if (!active) return undefined
    const onPointer = (event: PointerEvent) => {
      if (!kept.has(event)) latest.current()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [active, latest])
}
