import type { ShortcutConflict } from '../../../app/shortcuts/keymap'
import type { ShortcutPress } from '../../../app/shortcuts/keys'
import type { ShortcutCommandId } from '../../../shared/shortcut-commands'
import type { ShortcutKeyText } from '../../../shared/shortcut-key'

// The state of the edits of the Keyboard shortcuts tab, which
// `useShortcutEditor` keeps.

/** A row whose recorder waits for a key. */
export interface Recording {
  readonly kind: 'recording'
  readonly command: ShortcutCommandId
  /** The key that the recorder replaces, or none after Add shortcut or +. */
  readonly replaces?: ShortcutKeyText
  /**
   * A recorded key that waits: for its save, or for Replace or Cancel while
   * other commands hold it.
   */
  readonly recorded?: ShortcutKeyText
  /** The commands that hold the recorded key. */
  readonly held: readonly ShortcutConflict[]
  /** The last fixed key that the recorder did not take. */
  readonly refused?: ShortcutKeyText
}

/** A Reset whose default keys other commands hold, which waits for Replace or Cancel. */
export interface ResetQuestion {
  readonly kind: 'reset'
  readonly command: ShortcutCommandId
  readonly held: readonly ShortcutConflict[]
}

/** A save that failed, with what failed: a key, a removal, a Reset, or Reset all. */
export type FailedSave =
  | {
      readonly kind: 'not-saved' | 'not-removed'
      readonly command: ShortcutCommandId
      readonly key: ShortcutKeyText
    }
  | { readonly kind: 'not-reset'; readonly command: ShortcutCommandId }
  | { readonly kind: 'not-reset-all' }

/**
 * The control that takes the focus after an edit: a key of a row by its
 * place, the Add shortcut or + of the row, its Reset, or its Replace, or
 * the search field. A place without a key falls back to Add shortcut or +.
 */
export type FocusTarget =
  | {
      readonly command: ShortcutCommandId
      readonly at: number | 'add' | 'reset' | 'replace'
    }
  | 'search'

/** What a save does: a recorded key, Remove, Replace, Reset, or Reset all. */
export type SaveAction = 'key' | 'remove' | 'replace' | 'reset' | 'reset-all'

/**
 * The edits of the tab: the edit that shows, the save that runs, the last
 * failed save, the focus after an edit, and the actions of the controls.
 */
export interface ShortcutEditor {
  readonly edit: Recording | ResetQuestion | null
  /** A save runs, so the controls of the tab are off. */
  readonly saving: boolean
  /** The save of this action of this row runs, so its button shows it. */
  busy(action: SaveAction, command?: ShortcutCommandId): boolean
  /** The last save that failed, until the next edit. */
  readonly failed: FailedSave | null
  readonly focus: FocusTarget | null
  /** Starts the recorder of a row, in the place of a key, or after the keys. */
  record(command: ShortcutCommandId, replaces?: ShortcutKeyText): void
  /** A key that the recorder heard. */
  take(press: ShortcutPress): void
  /** Escape and Cancel end the edit, and the row keeps its keys. */
  cancel(): void
  /** Ends the edit without a move of the focus, such as for a new search. */
  stop(): void
  remove(): void
  replace(): void
  reset(command: ShortcutCommandId): void
  /** Saves Reset all, and says whether the save worked. */
  resetAll(): Promise<boolean>
  focusSearch(): void
  /** The focus moved as `focus` asked. */
  focused(): void
}
