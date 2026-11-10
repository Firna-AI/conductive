import {
  isShortcutCommandId,
  shortcutCommandIds,
  type ShortcutCommandId,
} from './shortcut-commands'
import { isFixedShortcut } from './shortcut-fixed'
import {
  readShortcutKeyText,
  ShortcutContractError,
  type ShortcutKeyboard,
  type ShortcutKeyText,
} from './shortcut-key'
import {
  SHORTCUT_KEYS_LIMIT,
  type SaveShortcutsRequest,
  type SaveShortcutsResponse,
  type ShortcutChange,
  type ShortcutPreferences,
} from './shortcuts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value
  throw new ShortcutContractError('Send a valid shortcut change.')
}

function keyboardOf(value: unknown): ShortcutKeyboard {
  if (value === 'mac' || value === 'other') return value
  throw new ShortcutContractError('Choose a shortcut keyboard.')
}

function commandOf(value: unknown): ShortcutCommandId {
  if (isShortcutCommandId(value)) return value
  throw new ShortcutContractError('Choose a shortcut command.')
}

function list(value: unknown, limit = Infinity): unknown[] {
  if (!Array.isArray(value) || value.length > limit) {
    throw new ShortcutContractError('Send a valid list of shortcut changes.')
  }
  return value
}

function keyOf(value: unknown, keyboard: ShortcutKeyboard): ShortcutKeyText {
  const key = readShortcutKeyText(value)
  if (isFixedShortcut(key, keyboard)) {
    throw new ShortcutContractError('Choose a key that is not fixed.')
  }
  return key
}

function keysOf(value: unknown, keyboard: ShortcutKeyboard): ShortcutKeyText[] {
  if (!Array.isArray(value) || value.length > SHORTCUT_KEYS_LIMIT) {
    throw new ShortcutContractError('Choose at most four keys for a command.')
  }
  return value.map((value) => keyOf(value, keyboard))
}

/** A write validates the whole batch before its caller can save anything. */
export function readSaveShortcutsRequest(value: unknown): SaveShortcutsRequest {
  const body = record(value)
  const keyboard = keyboardOf(body.keyboard)
  return {
    keyboard,
    changes: list(body.changes, shortcutCommandIds.length).map((value) => {
      const change = record(value)
      return {
        command: commandOf(change.command),
        keys: change.keys === null ? null : keysOf(change.keys, keyboard),
      }
    }),
  }
}

function readChanges(
  value: unknown,
  keyboard: ShortcutKeyboard,
): ShortcutChange[] {
  return list(value).flatMap((value) => {
    const change = record(value)
    // An older stored command can outlive its entry in the current app.
    if (!isShortcutCommandId(change.command)) return []
    const storedKeys = list(change.keys, SHORTCUT_KEYS_LIMIT)
    const keys = storedKeys.flatMap((value) => {
      try {
        return [keyOf(value, keyboard)]
      } catch (error) {
        if (error instanceof ShortcutContractError) return []
        throw error
      }
    })
    if (storedKeys.length > 0 && keys.length === 0) return []
    return [{ command: change.command, keys }]
  })
}

export function readShortcutPreferences(value: unknown): ShortcutPreferences {
  const body = record(value)
  return {
    mac: readChanges(body.mac, 'mac'),
    other: readChanges(body.other, 'other'),
  }
}

export function readSaveShortcutsResponse(
  value: unknown,
): SaveShortcutsResponse {
  const body = record(value)
  const keyboard = keyboardOf(body.keyboard)
  return { keyboard, changes: readChanges(body.changes, keyboard) }
}
