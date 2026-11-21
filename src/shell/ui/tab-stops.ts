import { focusableSelector } from './Overlay'

/** The controls of a layer that Tab reaches, in their order. */
export function controlsOf(layer: HTMLElement): HTMLElement[] {
  return Array.from(
    layer.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => element.tabIndex >= 0)
}

/** The parts of a key press, of the page or of React, that a stop reads. */
type TabPress = Pick<KeyboardEvent, 'shiftKey' | 'target' | 'preventDefault'>

/**
 * The stops of Tab in a modal card while its body scrolls text, in their
 * order: the `controls`, and the body before the controls that come after
 * it. The body is a stop only while its content is taller than its box and
 * it holds none of the controls, such as a long list of files under a
 * question. Else this gives null.
 */
function textStops(
  controls: readonly HTMLElement[],
  body: HTMLElement | null,
): HTMLElement[] | null {
  if (!body || body.scrollHeight <= body.clientHeight) return null
  if (controls.some((control) => body.contains(control))) return null
  const after = controls.findIndex(
    (control) =>
      (body.compareDocumentPosition(control) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
      0,
  )
  const at = after === -1 ? controls.length : after
  return [...controls.slice(0, at), body, ...controls.slice(at)]
}

/**
 * Moves the focus for a press of Tab in a modal card while its body scrolls
 * text, so that the keys of the keyboard can scroll the body too. The body
 * takes the focus only from the code, with `tabIndex={-1}`, because Safari
 * makes no box that scrolls a stop of Tab by itself. So each press moves
 * the focus here: Tab to the next stop, and Shift+Tab to the one before,
 * with a wrap at each end. From outside the stops, Tab goes to the first
 * and Shift+Tab to the last.
 *
 * Gives false, and does nothing, while the body is no stop. Then the trap
 * of the card moves Tab between its controls, as for a card that does not
 * scroll.
 */
export function tabWithScrollingBody(
  event: TabPress,
  controls: readonly HTMLElement[],
  body: HTMLElement | null,
): boolean {
  const stops = textStops(controls, body)
  if (!stops) return false
  event.preventDefault()
  const from = stops.findIndex((stop) => stop === event.target)
  const back = event.shiftKey
  if (from === -1) {
    ;(back ? stops.at(-1) : stops[0])?.focus()
  } else {
    stops.at((from + (back ? -1 : 1)) % stops.length)?.focus()
  }
  return true
}

/**
 * Keeps a press of Tab inside a modal layer, among its `tabbable` elements
 * in their order. Tab from the last goes to the first, and Shift+Tab from
 * the first goes to the last. From an element that is not one of them, such
 * as the layer itself or a body that does not scroll, Tab goes to the first
 * and Shift+Tab to the last. Between them, the browser moves the focus.
 * Without an element, Tab does nothing. `from` is the element with the
 * focus, which each trap reads where it listens.
 */
export function keepTabInside(
  event: Pick<TabPress, 'shiftKey' | 'preventDefault'>,
  tabbable: readonly HTMLElement[],
  from: EventTarget | null,
): void {
  const first = tabbable[0]
  const last = tabbable.at(-1)
  if (!first || !last) {
    event.preventDefault()
    return
  }
  const inside = tabbable.some((element) => element === from)
  if (event.shiftKey && (from === first || !inside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (from === last || !inside)) {
    event.preventDefault()
    first.focus()
  }
}
