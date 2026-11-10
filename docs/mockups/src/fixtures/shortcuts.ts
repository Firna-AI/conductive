import type { Shortcut } from '../components/common/KeyChips'
import type { FixedRow, FixedSpec } from './fixedShortcuts'
import {
  shortcutSpecs,
  type CommandId,
  type CommandSpec,
} from './shortcutCommands'
import { keyboardOf, type Keyboard, type ShortcutHost } from './shortcutHosts'
import { windowsKeys } from './windowsShortcuts'

/**
 * A command as the tab shows it: its default shortcuts on the keyboard of
 * the page. `words` are more words that a search of the tab finds it by,
 * which the row does not show.
 */
export type CommandRow = {
  kind: 'command'
  id: CommandId
  label: string
  keys: readonly Shortcut[]
  words?: readonly string[]
}

/**
 * A row of the Keyboard shortcuts tab: a command that a person can change,
 * or a fixed shortcut.
 */
export type ShortcutRow = CommandRow | FixedRow

export type ShortcutGroup = {
  label: string
  description?: string
  rows: readonly ShortcutRow[]
}

/** A command holds at most four shortcuts. */
export const shortcutLimit = 4

/** The default keys of a command on a keyboard. */
function keysOf(spec: CommandSpec, keyboard: Keyboard): readonly Shortcut[] {
  return keyboard === 'mac' ? spec.mac : windowsKeys[spec.id]
}

/**
 * A row as a host shows it, or none. A row of the Mac app shows only
 * there, and a fixed row without keys on the keyboard does not show.
 */
function rowIn(
  spec: CommandSpec | FixedSpec,
  host: ShortcutHost,
): ShortcutRow | undefined {
  if (spec.only === 'mac-app' && host !== 'mac-app') return undefined
  const keyboard = keyboardOf(host)
  const { label, words } = spec
  if (spec.kind === 'command') {
    const keys = keysOf(spec, keyboard)
    return { kind: 'command', id: spec.id, label, keys, words }
  }
  const keys = spec[keyboard]
  return keys.length === 0 ? undefined : { kind: 'fixed', label, keys, words }
}

/**
 * The groups of the tab on a host, with the keys of its keyboard. Only the
 * Mac app has the sidebar toggle, Back, Forward, and its menus, so a
 * browser leaves them out.
 */
export function shortcutGroups(host: ShortcutHost): ShortcutGroup[] {
  return shortcutSpecs
    .filter((group) => group.only !== 'mac-app' || host === 'mac-app')
    .map((group) => ({
      label: group.label,
      description: group.description,
      rows: group.rows.flatMap((spec) => rowIn(spec, host) ?? []),
    }))
}

const commandSpecs = shortcutSpecs
  .flatMap((group) => group.rows)
  .filter((spec): spec is CommandSpec => spec.kind === 'command')

/** Each command that a person can change, in the order of the tab. */
export const commandIds: readonly CommandId[] = commandSpecs.map(
  (spec) => spec.id,
)

/** The default shortcuts of a command on a keyboard. */
export function defaultShortcuts(
  id: CommandId,
  keyboard: Keyboard,
): readonly Shortcut[] {
  const spec = commandSpecs.find((row) => row.id === id)
  return spec ? keysOf(spec, keyboard) : []
}

/** The label of a command, as the tab shows it. */
export function commandLabel(id: CommandId): string {
  return commandSpecs.find((row) => row.id === id)?.label ?? id
}

/**
 * The fixed shortcut that a key is on a host, such as Hide Conductive for
 * ⌘H in the Mac app.
 */
export function fixedLabel(
  shortcut: Shortcut,
  host: ShortcutHost,
): string | undefined {
  return shortcutGroups(host)
    .flatMap((group) => group.rows)
    .find((row) => row.kind === 'fixed' && row.keys.includes(shortcut))?.label
}
