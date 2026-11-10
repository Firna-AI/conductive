import { listedCommands } from '../../app/palette/listed-commands'
import { useShortcutOffers } from '../shortcuts/shortcut-context'
import { usePaletteBase } from './use-palette-source'
import { useRowAction } from './row-action'

/**
 * Offers to the keys each command that the palette lists now, also while
 * the palette is closed. A key does what its row does, so a key runs only
 * where the palette offers its command, as for Archive workspace, which
 * shows only to the owner of the workspace and to the admins. It draws
 * nothing.
 */
export function PaletteKeys() {
  const base = usePaletteBase()
  const action = useRowAction(base.org?.id)
  useShortcutOffers(
    listedCommands(base).map(({ command, row }) => ({
      command,
      run: action(row),
    })),
  )
  return null
}
