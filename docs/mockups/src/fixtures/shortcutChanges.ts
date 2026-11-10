import type { Shortcut } from '../components/common/KeyChips'
import type { CommandId } from './shortcutCommands'
import {
  keyboardOf,
  worksIn,
  type Keyboard,
  type ShortcutHost,
} from './shortcutHosts'
import { commandIds, defaultShortcuts } from './shortcuts'

/**
 * The person's changes on one keyboard, which the account holds (decision
 * 190): the shortcuts of each command that differs from its defaults. An
 * empty list removes every shortcut of the command.
 */
export type ShortcutChanges = Partial<
  Readonly<Record<CommandId, readonly Shortcut[]>>
>

/**
 * The changes after a few edits on a Mac keyboard: ⇧⌘P opens the palette,
 * and ⌘/ opens the Keyboard shortcuts tab. Replace took ⌘/ from Model
 * picker, which has no shortcut now.
 */
export const editedShortcuts: ShortcutChanges = {
  'command-palette': ['⇧⌘P'],
  'keyboard-shortcuts': ['⌘/'],
  'model-picker': [],
}

/** The shortcuts of a command on a keyboard after the person's changes. */
export function shortcutsOf(
  id: CommandId,
  changes: ShortcutChanges,
  keyboard: Keyboard,
): readonly Shortcut[] {
  return changes[id] ?? defaultShortcuts(id, keyboard)
}

/** The first shortcut of the palette on a Mac, which the Search row shows. */
export function paletteShortcut(
  changes: ShortcutChanges = {},
): Shortcut | undefined {
  return shortcutsOf('command-palette', changes, 'mac')[0]
}

/**
 * The shortcut that a palette row shows on a host: the first shortcut of
 * its command that works there. A Chrome tab on a Mac keeps ⌘N, so New
 * workspace shows ⌥⌘N there.
 */
export function shownShortcut(
  id: CommandId,
  changes: ShortcutChanges,
  host: ShortcutHost,
): Shortcut | undefined {
  return shortcutsOf(id, changes, keyboardOf(host)).find((shortcut) =>
    worksIn(host, shortcut),
  )
}

/**
 * The command whose row records a new shortcut in the states of the tab.
 * Its key ⌥⌘/ was pressed, so the recorder takes the place of that key.
 */
export const recordingCommand: CommandId = 'keyboard-shortcuts'

/**
 * A fixed shortcut that the recorder does not take: ⌘H hides the Mac app.
 * A browser has no menus of the Mac app, so there the person pressed the
 * Undo of the text fields.
 */
export function refusedShortcut(host: ShortcutHost): Shortcut {
  if (host === 'mac-app') return '⌘H'
  return keyboardOf(host) === 'mac' ? '⌘Z' : 'Ctrl+Z'
}

/** A recorded shortcut of another command, which Replace moves here. */
export const takenShortcut = {
  shortcut: '⌘/',
  owner: 'model-picker',
} as const satisfies { shortcut: Shortcut; owner: CommandId }

/**
 * The command whose Reset the states of the tab draw: Model picker, whose
 * default ⌘/ Replace gave to Keyboard shortcuts in the changes.
 */
export const resetCommand: CommandId = 'model-picker'

/**
 * The first default shortcut of a command that another command holds after
 * the changes, with that command. Reset then names that command, and asks
 * before it takes the shortcut.
 */
export function heldDefault(
  id: CommandId,
  changes: ShortcutChanges,
  keyboard: Keyboard,
): { shortcut: Shortcut; owner: CommandId } | undefined {
  for (const shortcut of defaultShortcuts(id, keyboard)) {
    const owner = commandIds.find(
      (other) =>
        other !== id &&
        shortcutsOf(other, changes, keyboard).includes(shortcut),
    )
    if (owner) return { shortcut, owner }
  }
  return undefined
}

/** A change of the palette shortcut to ⇧⌘P that the app did not save. */
export const unsavedChange = {
  command: 'command-palette',
  shortcut: '⇧⌘P',
} as const satisfies { command: CommandId; shortcut: Shortcut }
