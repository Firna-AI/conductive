import { useNavigation } from '../../app/navigation'
import type { PaletteRow } from '../../app/palette/palette-rows'
import { useNewWorkspace } from '../new-workspace/NewWorkspaceHost'

/**
 * What running a row of the palette does: its own action, the page that it
 * opens, or New workspace as the page or the dialog that the person chose,
 * in the org of the palette. A row of the open palette runs it after the
 * palette closes. A key of the command of the row runs it at once, because
 * the palette is closed then.
 */
export function useRowAction(
  orgId: string | undefined,
): (row: PaletteRow) => () => void {
  const navigation = useNavigation()
  const newWorkspace = useNewWorkspace().open
  return (row) => {
    if (row.kind === 'command') {
      const { lead } = row
      const opensForm = lead.kind === 'action' && lead.id === 'new-workspace'
      if (opensForm && orgId !== undefined) {
        return () => newWorkspace({ orgId, sectionId: null })
      }
      if (row.run) return row.run
    }
    const { href } = row
    return href === undefined ? () => undefined : () => navigation.push(href)
  }
}
