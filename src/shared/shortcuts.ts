import type { ShortcutCommandId } from './shortcut-commands'
import type { ShortcutKeyboard, ShortcutKeyText } from './shortcut-key'

export const SHORTCUT_KEYS_LIMIT = 4

/** An empty key list removes every key, without restoring the defaults. */
export interface ShortcutChange {
  readonly command: ShortcutCommandId
  readonly keys: readonly ShortcutKeyText[]
}

export interface ShortcutPreferences {
  readonly mac: readonly ShortcutChange[]
  readonly other: readonly ShortcutChange[]
}

/** Null removes the account override. It differs from an empty key list. */
interface ShortcutUpdate {
  readonly command: ShortcutCommandId
  readonly keys: readonly ShortcutKeyText[] | null
}

export interface SaveShortcutsRequest {
  readonly keyboard: ShortcutKeyboard
  readonly changes: readonly ShortcutUpdate[]
}

/** The confirmed overrides for the keyboard that was saved. */
export interface SaveShortcutsResponse {
  readonly keyboard: ShortcutKeyboard
  readonly changes: readonly ShortcutChange[]
}
