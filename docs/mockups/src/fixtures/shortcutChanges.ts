import type { Shortcut } from '../components/common/KeyChips'
import { defaultShortcuts, type CommandId } from './shortcuts'

/**
 * The person's changes, which the account holds (decision 190): the
 * shortcuts of each command that differs from its defaults. An empty list
 * removes every shortcut of the command.
 */
export type ShortcutChanges = Partial<
  Readonly<Record<CommandId, readonly Shortcut[]>>
>

/**
 * The changes after a few edits: ⇧⌘P opens the palette, and ⌘/ opens the
 * Keyboard shortcuts tab. Replace took ⌘/ from Model picker, which has no
 * shortcut now.
 */
export const editedShortcuts: ShortcutChanges = {
  'command-palette': ['⇧⌘P'],
  'keyboard-shortcuts': ['⌘/'],
  'model-picker': [],
}

/** The shortcuts of a command after the person's changes. */
export function shortcutsOf(
  id: CommandId,
  changes: ShortcutChanges,
): readonly Shortcut[] {
  return changes[id] ?? defaultShortcuts(id)
}

/** The first shortcut of the palette, which the Search row shows. */
export function paletteShortcut(
  changes: ShortcutChanges = {},
): Shortcut | undefined {
  return shortcutsOf('command-palette', changes)[0]
}

/**
 * The command whose row records a new shortcut in the states of the tab.
 * Its key ⌥⌘/ was pressed, so the recorder takes the place of that key.
 */
export const recordingCommand: CommandId = 'keyboard-shortcuts'

/** A fixed shortcut that the recorder does not take: ⌘H hides the app. */
export const refusedShortcut: Shortcut = '⌘H'

/** A recorded shortcut of another command, which Replace moves here. */
export const takenShortcut = {
  shortcut: '⌘/',
  owner: 'model-picker',
} as const satisfies { shortcut: Shortcut; owner: CommandId }

/** A change of the palette shortcut to ⇧⌘P that the app did not save. */
export const unsavedChange = {
  command: 'command-palette',
  shortcut: '⇧⌘P',
} as const satisfies { command: CommandId; shortcut: Shortcut }
