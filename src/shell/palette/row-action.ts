import { useNavigation } from '../../app/navigation'
import type { PaletteBase } from '../../app/palette/palette-source'
import type { PaletteRow } from '../../app/palette/palette-rows'
import { useApp } from '../context'
import { useNewWorkspace } from '../new-workspace/NewWorkspaceHost'

/** Where the palette works: its org, the open workspace, and the window. */
type RowPlace = Pick<PaletteBase, 'org' | 'openWorkspaceId' | 'mac'>

/**
 * What running a row of the palette does: its own action, the page that it
 * opens, New workspace as the page or the dialog that the person chose, in
 * the org of the palette, or the Feedback dialog over the page, with the
 * org of the palette and the open workspace. A row of the open palette
 * runs it after the palette closes. A key of the command of the row runs
 * it at once, because the palette is closed then.
 */
export function useRowAction(place: RowPlace): (row: PaletteRow) => () => void {
  const navigation = useNavigation()
  const newWorkspace = useNewWorkspace().open
  const { feedback } = useApp()
  return (row) => {
    if (row.kind === 'command') {
      const { lead } = row
      const orgId = place.org?.id
      const own = lead.kind === 'action' ? lead.id : null
      if (own === 'new-workspace' && orgId !== undefined) {
        return () => newWorkspace({ orgId, sectionId: null })
      }
      if (own === 'send-feedback') {
        return () =>
          void feedback.open({
            orgId: orgId ?? null,
            workspaceId: place.openWorkspaceId,
            desktop: place.mac,
          })
      }
      if (row.run) return row.run
    }
    const { href } = row
    return href === undefined ? () => undefined : () => navigation.push(href)
  }
}
