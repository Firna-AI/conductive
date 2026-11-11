import { defaultShortcutKeys } from '../../../app/shortcuts/defaults'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../../shared/shortcut-key'
import type {
  SaveShortcutsRequest,
  ShortcutChange,
} from '../../../shared/shortcuts'

/** The changes of one save: the keys of a command, or null for its defaults. */
type ShortcutUpdates = SaveShortcutsRequest['changes']

function sameKeys(
  left: readonly ShortcutKeyText[],
  right: readonly ShortcutKeyText[],
): boolean {
  return (
    left.length === right.length && left.every((key, at) => key === right[at])
  )
}

/**
 * The save of a batch of changes on a keyboard. The account stores only the
 * commands whose keys differ from their defaults, so a command that gets
 * its default keys back saves as a reset.
 */
export function saveOf(
  keyboard: ShortcutKeyboard,
  changes: readonly ShortcutChange[],
): SaveShortcutsRequest {
  const updates: ShortcutUpdates = changes.map((change) => ({
    command: change.command,
    keys: sameKeys(change.keys, defaultShortcutKeys(change.command, keyboard))
      ? null
      : change.keys,
  }))
  return { keyboard, changes: updates }
}

/** Reset all: each changed command of the keyboard gets its defaults again. */
export function resetAllOf(
  keyboard: ShortcutKeyboard,
  changed: readonly ShortcutChange[],
): SaveShortcutsRequest {
  return {
    keyboard,
    changes: changed.map((change) => ({ command: change.command, keys: null })),
  }
}

/**
 * The keys of a command after the recorder took `key`: in the place of
 * `replaces`, or after the other keys when it adds one.
 */
export function recordedKeys(
  keys: readonly ShortcutKeyText[],
  key: ShortcutKeyText,
  replaces: ShortcutKeyText | undefined,
): ShortcutKeyText[] {
  if (replaces === undefined) return [...keys, key]
  return keys.map((held) => (held === replaces ? key : held))
}

/** The keys of a command after Remove took one off. */
export function removedKeys(
  keys: readonly ShortcutKeyText[],
  removed: ShortcutKeyText,
): ShortcutKeyText[] {
  return keys.filter((key) => key !== removed)
}
