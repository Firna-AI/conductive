import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import { actionGroups, settingGroups } from './palette-groups'
import type { CommandRow } from './palette-rows'
import type { PaletteBase } from './palette-source'

/** A row that the palette lists, with the command of the keys that it runs. */
export interface ListedCommand {
  readonly command: ShortcutCommandId
  readonly row: CommandRow
}

/**
 * The commands of the keys that the palette lists now: the rows of its
 * actions and of its settings that have a command, each command once. A
 * key of such a command runs only while the palette lists its row, and it
 * does what the row does.
 */
export function listedCommands(source: PaletteBase): ListedCommand[] {
  const groups = [...actionGroups(source), ...settingGroups(source, false)]
  const listed = new Map<ShortcutCommandId, CommandRow>()
  for (const row of groups.flatMap((group) => group.rows)) {
    if (row.kind !== 'command' || row.command === undefined) continue
    if (!listed.has(row.command)) listed.set(row.command, row)
  }
  return [...listed].map(([command, row]) => ({ command, row }))
}
