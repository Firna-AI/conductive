import { act } from 'react'
import { onTestFinished } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { defaultShortcutKeys } from '../../app/shortcuts/defaults'
import {
  buildShortcutKeymap,
  firstShortcutKey,
} from '../../app/shortcuts/keymap'
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

/** The punctuation keys that the kit presses: their code, and their character with Shift. */
const punctuation: Readonly<Record<string, { code: string; shifted: string }>> =
  {
    '[': { code: 'BracketLeft', shifted: '{' },
    ']': { code: 'BracketRight', shifted: '}' },
    '/': { code: 'Slash', shifted: '?' },
    ',': { code: 'Comma', shifted: '<' },
  }

/** The `key` and `code` that a US keyboard gives for the key of a shortcut. */
function keyAndCode(name: string, shift: boolean): KeyboardEventInit {
  if (/^[A-Z]$/.test(name)) {
    return { key: shift ? name : name.toLowerCase(), code: `Key${name}` }
  }
  if (/^\d$/.test(name)) return { key: name, code: `Digit${name}` }
  if (name === 'Space') return { key: ' ', code: 'Space' }
  if (namedKeys.has(name)) return { key: name, code: name }
  const mark = punctuation[name]
  if (mark) return { key: shift ? mark.shifted : name, code: mark.code }
  throw new Error(`The test kit has no key for ${name}.`)
}

/**
 * Presses a key, such as `Alt+Shift+N` in the key text of the shortcuts,
 * on `target`, by default the focused element, as a US keyboard sends it.
 * `key` replaces the character of the press, such as `Dead` for ⌥N on a
 * Mac, and `code` its physical key, such as `NumpadDivide` for the / of the
 * keypad. `repeat` sends the press again of a key that the person holds.
 * The result is the event, whose `defaultPrevented` says whether the
 * browser's own action of the key was stopped.
 */
export function pressShortcut(
  text: string,
  target: EventTarget = document.activeElement ?? document.body,
  options: {
    key?: string
    code?: string
    repeat?: boolean
    isComposing?: boolean
    type?: 'keydown' | 'keyup'
  } = {},
): KeyboardEvent {
  const chord = shortcutChord(readShortcutKeyText(text))
  const event = new KeyboardEvent(options.type ?? 'keydown', {
    ...keyAndCode(chord.key, chord.shiftKey),
    ...(options.key === undefined ? {} : { key: options.key }),
    ...(options.code === undefined ? {} : { code: options.code }),
    metaKey: chord.metaKey,
    ctrlKey: chord.ctrlKey,
    altKey: chord.altKey,
    shiftKey: chord.shiftKey,
    repeat: options.repeat ?? false,
    isComposing: options.isComposing ?? false,
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

/**
 * Presses the key that the hints of the command show in the host of the
 * app: the first key of the command that works there, with the changes of
 * the account, such as ⌥⌘N in a Chrome tab on a Mac, which keeps ⌘N.
 */
export function pressHintKey(
  app: AppModel,
  command: ShortcutCommandId,
  target?: EventTarget,
): KeyboardEvent {
  const { platform, host } = app.services
  const changes = app.account.account.get()?.shortcuts[platform] ?? []
  const keymap = buildShortcutKeymap(platform, changes)
  const key = firstShortcutKey(command, keymap, platform, host)
  if (key === undefined) throw new Error(`${command} has no key here.`)
  return pressShortcut(key, target)
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
