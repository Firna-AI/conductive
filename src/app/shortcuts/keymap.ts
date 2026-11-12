import {
  shortcutCommandIds,
  type ShortcutCommandId,
} from '../../shared/shortcut-commands'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../shared/shortcut-key'
import type { ShortcutChange } from '../../shared/shortcuts'
import { shortcutKeyAvailability } from './browser-keys'
import { commandInHost, defaultShortcutKeys } from './defaults'
import type { ShortcutHost } from './host'

export type ShortcutKeymap = ReadonlyMap<
  ShortcutCommandId,
  readonly ShortcutKeyText[]
>

export function buildShortcutKeymap(
  keyboard: ShortcutKeyboard,
  changes: readonly ShortcutChange[],
): ShortcutKeymap {
  const keymap = new Map(
    shortcutCommandIds.map((id) => [id, defaultShortcutKeys(id, keyboard)]),
  )
  for (const change of changes) keymap.set(change.command, [...change.keys])
  return keymap
}

export interface ShortcutConflict {
  readonly command: ShortcutCommandId
  readonly key: ShortcutKeyText
}

/** All commands can share a Mac workspace page, including its rail and sidebar. */
export function shortcutConflicts(
  command: ShortcutCommandId,
  keys: readonly ShortcutKeyText[],
  keymap: ShortcutKeymap,
): ShortcutConflict[] {
  return [...keymap].flatMap(([id, held]) =>
    id === command
      ? []
      : keys
          .filter((key) => held.includes(key))
          .map((key) => ({ command: id, key })),
  )
}

/** Replace and Reset send the target and each affected owner in the same batch. */
export function replaceShortcutKeys(
  command: ShortcutCommandId,
  keys: readonly ShortcutKeyText[],
  keymap: ShortcutKeymap,
): ShortcutChange[] {
  const conflicts = shortcutConflicts(command, keys, keymap)
  return [
    { command, keys: [...keys] },
    ...[...new Set(conflicts.map((conflict) => conflict.command))].map(
      (owner) => ({
        command: owner,
        keys: (keymap.get(owner) ?? []).filter((key) => !keys.includes(key)),
      }),
    ),
  ]
}

/** The first usable key is the hint for this host. A removed key has no hint. */
export function firstShortcutKey(
  command: ShortcutCommandId,
  keymap: ShortcutKeymap,
  keyboard: ShortcutKeyboard,
  host: ShortcutHost,
): ShortcutKeyText | undefined {
  if (!commandInHost(command, host)) return undefined
  return keymap
    .get(command)
    ?.find(
      (key) => shortcutKeyAvailability(key, keyboard, host) === 'available',
    )
}
