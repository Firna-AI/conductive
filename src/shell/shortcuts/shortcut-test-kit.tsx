import { act } from 'react'
import { onTestFinished } from 'vitest'
import { defaultShortcutKeys } from '../../app/shortcuts/defaults'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import {
  readShortcutKeyText,
  shortcutChord,
  type ShortcutKeyboard,
} from '../../shared/shortcut-key'
import { useShortcutOffer } from './shortcut-context'

// The helpers of the tests that press the keys of shortcuts in the app.

/** The named keys that the kit presses, with the same `key` and `code`. */
const namedKeys: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Backspace',
  'Delete',
  'Enter',
  'Escape',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Tab',
])

/** The `key` and `code` that a US keyboard gives for the key of a shortcut. */
function keyAndCode(name: string, shift: boolean): KeyboardEventInit {
  if (/^[A-Z]$/.test(name)) {
    return { key: shift ? name : name.toLowerCase(), code: `Key${name}` }
  }
  if (/^\d$/.test(name)) return { key: name, code: `Digit${name}` }
  if (namedKeys.has(name)) return { key: name, code: name }
  throw new Error(`The test kit has no key for ${name}.`)
}

/**
 * Presses a key, such as `Alt+Shift+N` in the key text of the shortcuts,
 * on `target`, by default the focused element, as a US keyboard sends it.
 * `key` replaces the character of the press, such as `Dead` for ⌥N on a
 * Mac. The result is the event, whose `defaultPrevented` says whether the
 * browser's own action of the key was stopped.
 */
export function pressShortcut(
  text: string,
  target: EventTarget = document.activeElement ?? document.body,
  key?: string,
): KeyboardEvent {
  const chord = shortcutChord(readShortcutKeyText(text))
  const event = new KeyboardEvent('keydown', {
    ...keyAndCode(chord.key, chord.shiftKey),
    ...(key === undefined ? {} : { key }),
    metaKey: chord.metaKey,
    ctrlKey: chord.ctrlKey,
    altKey: chord.altKey,
    shiftKey: chord.shiftKey,
    bubbles: true,
    cancelable: true,
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

/** Presses the first default key of the command on the keyboard. */
export function pressCommand(
  command: ShortcutCommandId,
  keyboard: ShortcutKeyboard,
  target?: EventTarget,
): KeyboardEvent {
  const [first] = defaultShortcutKeys(command, keyboard)
  if (first === undefined) throw new Error(`${command} has no default key.`)
  return pressShortcut(first, target)
}

/** The keys of the presses that reach the element itself, in their order. */
export function keysHeardBy(element: Element): string[] {
  const heard: string[] = []
  const hear = (event: Event) => {
    if (event instanceof KeyboardEvent) heard.push(event.key)
  }
  element.addEventListener('keydown', hear)
  onTestFinished(() => element.removeEventListener('keydown', hear))
  return heard
}

/** A part of the page that offers the command to the keys while it shows. */
export function OfferedCommand(props: {
  command: ShortcutCommandId
  run: () => void
}) {
  useShortcutOffer(props.command, props.run)
  return null
}
