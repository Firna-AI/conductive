/** The modifier key that makes xterm.js select while a program has the mouse. */
export type ForcedSelectionKey = 'altKey' | 'shiftKey'

/** The values of `navigator.platform` that xterm.js 6 reads as a Mac. */
const macPlatforms: readonly string[] = [
  'Macintosh',
  'MacIntel',
  'MacPPC',
  'Mac68K',
]

/** Whether xterm.js 6 reads a `navigator.platform` value as a Mac. */
export function isMacPlatform(platform: string): boolean {
  return macPlatforms.includes(platform)
}

/**
 * The key that xterm.js 6 takes as a forced selection: Option on a Mac,
 * with its `macOptionClickForcesSelection` option on, and Shift elsewhere.
 * xterm.js tells a Mac from `navigator.platform`, so pass that value. A
 * forced press with the other key would not select.
 */
export function forcedSelectionKey(platform: string): ForcedSelectionKey {
  return isMacPlatform(platform) ? 'altKey' : 'shiftKey'
}

function isPlainLeftPress(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  )
}

/** The fields of a press that xterm.js reads, for a copy of the press. */
function pressInit(event: MouseEvent): MouseEventInit {
  return {
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    composed: event.composed,
    view: event.view,
    detail: event.detail,
    screenX: event.screenX,
    screenY: event.screenY,
    clientX: event.clientX,
    clientY: event.clientY,
    button: event.button,
    buttons: event.buttons,
    relatedTarget: event.relatedTarget,
  }
}

/**
 * Keeps plain left presses for the selection of the page while a program
 * has the mouse, so that a plain drag selects text. Each such press reaches
 * the screen again as a forced selection, with the same position, buttons,
 * and click count. The first press goes no further. A press with a
 * modifier, such as Cmd or Ctrl, a right or a middle press, and each press
 * while no program has the mouse pass unchanged, so they still reach the
 * program. Returns the function that stops the rule.
 */
export function keepPlainPresses(
  element: HTMLElement,
  programHasMouse: () => boolean,
  forceKey: ForcedSelectionKey,
): () => void {
  const sentAgain = new WeakSet<Event>()
  const onPress = (event: MouseEvent) => {
    const { target } = event
    if (sentAgain.has(event) || !target) return
    if (!isPlainLeftPress(event) || !programHasMouse()) return
    // The capture phase runs before xterm.js hears the press.
    event.stopImmediatePropagation()
    event.preventDefault()
    const init = pressInit(event)
    init[forceKey] = true
    const forced = new MouseEvent('mousedown', init)
    sentAgain.add(forced)
    target.dispatchEvent(forced)
  }
  element.addEventListener('mousedown', onPress, true)
  return () => element.removeEventListener('mousedown', onPress, true)
}
