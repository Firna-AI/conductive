import { ShortcutContractError } from '../../shared/shortcut-key'
import {
  readSaveShortcutsResponse,
  readShortcutPreferences,
} from '../../shared/shortcut-read'
import type {
  SaveShortcutsResponse,
  ShortcutPreferences,
} from '../../shared/shortcuts'
import { ParseError } from './parse'

/** A shared shortcut reader whose contract error is a parse error of the reply. */
function shortcutReply<T>(read: (value: unknown) => T, value: unknown): T {
  try {
    return read(value)
  } catch (error) {
    if (error instanceof ShortcutContractError)
      throw new ParseError(error.message)
    throw error
  }
}

export function readShortcuts(value: unknown): ShortcutPreferences {
  return shortcutReply(readShortcutPreferences, value)
}

/** The confirmed changes of the keyboard that a shortcut save saved. */
export function readSavedShortcuts(value: unknown): SaveShortcutsResponse {
  return shortcutReply(readSaveShortcutsResponse, value)
}
