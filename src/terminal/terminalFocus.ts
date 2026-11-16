/**
 * A request to move the keyboard focus to the terminal, such as a click on
 * its tab. The screen takes the focus when it shows, also when it mounts or
 * connects after the request.
 */
export interface TerminalFocusRequest {
  /** The element with the focus at the request, such as the tab. */
  readonly from: Element | null
}

/**
 * True while the focus has not moved since the request: it is still on the
 * element of the request, or on no element. So a screen that shows late
 * does not take the focus from a field that the user chose after the
 * request.
 */
export function focusUnmoved(request: TerminalFocusRequest): boolean {
  const active = document.activeElement
  return active === null || active === document.body || active === request.from
}
