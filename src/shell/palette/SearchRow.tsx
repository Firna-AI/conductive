import { Search } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import links from '../../../docs/mockups/src/components/workspaces/SidebarLinks.module.css'
import {
  paletteKeyHint,
  paletteKeyShortcut,
} from '../../app/palette/palette-keys'
import { useServices } from '../../app/services'
import type { RowVariant } from '../list/WorkspaceRow'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { usePalette } from './palette-context'

/**
 * The row under New workspace that opens the command palette, also in a
 * suspended org. On desktop it shows the palette key, ⌘K on a Mac and
 * Ctrl K elsewhere, so the row teaches the key. A phone has no key.
 */
export function SearchRow(props: { variant: RowVariant }) {
  const palette = usePalette()
  const { platform } = useServices()
  const phone = useViewport() === 'phone'
  return (
    <button
      aria-haspopup="dialog"
      aria-keyshortcuts={phone ? undefined : paletteKeyShortcut(platform)}
      className={classes(
        links.newWorkspace,
        props.variant === 'page' && links.page,
        ui.plainButton,
        ui.focusable,
      )}
      onClick={() => palette.show()}
      type="button"
    >
      <Search aria-hidden className={links.plus} size={14} />
      Search
      {phone ? null : (
        <kbd aria-hidden className={links.keys}>
          {paletteKeyHint(platform)}
        </kbd>
      )}
    </button>
  )
}
