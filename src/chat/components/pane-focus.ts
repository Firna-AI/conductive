import type {
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  SyntheticEvent,
} from 'react'

/** The events of a part of a pane that leaves the focused pane as it is. */
const kept = new WeakSet<Event>()

/** The handlers of a pane, or of a part of it, for the focus of the pane. */
export interface PaneFocusHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onFocus: (event: FocusEvent<HTMLElement>) => void
}

/** Marks an event that must not make its pane the focused pane. */
function keep(event: SyntheticEvent): void {
  kept.add(event.nativeEvent)
}

/**
 * The handlers of a part of a pane that leaves the focused pane as it is,
 * such as the session history, which reopens a session in the focused
 * pane, and the divider. Spread them on an element around that part. Each
 * event of the part reaches them before it reaches the pane.
 */
export const keepsPaneFocus: PaneFocusHandlers = {
  onPointerDown: keep,
  onKeyDown: keep,
  onFocus: keep,
}

/**
 * The handlers of a pane that make it the focused pane: a press in it, a
 * key in it, such as a typed letter, and the keyboard focus moving into it.
 * Spread them on the element of the pane. An event of a part that keeps the
 * focus, as `keepsPaneFocus` says, changes nothing.
 */
export function paneFocusHandlers(focus: () => void): PaneFocusHandlers {
  const take = (event: SyntheticEvent) => {
    if (!kept.has(event.nativeEvent)) focus()
  }
  return { onPointerDown: take, onKeyDown: take, onFocus: take }
}
