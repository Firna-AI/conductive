import { Search } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import links from '../../ui/components/workspaces/SidebarLinks.module.css'
import { ariaShortcut, shortcutTokens } from '../../app/shortcuts/keys'
import { useServices, type Platform } from '../../app/services'
import type { ShortcutKeyText } from '../../shared/shortcut-key'
import type { RowVariant } from '../list/WorkspaceRow'
import { useShortcutKey } from '../shortcuts/shortcut-context'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { usePalette } from './palette-context'

/**
 * The key as the row shows it: its keys with no space between them on a
 * Mac, such as ⌘K, and with a space on Windows and Linux, such as Ctrl K.
 */
function rowKey(key: ShortcutKeyText, keyboard: Platform): string {
  return shortcutTokens(key, keyboard).join(keyboard === 'mac' ? '' : ' ')
}

/**
 * The row under New workspace that opens the command palette, also in a
 * suspended org, through `PaletteController.show`, as the key does. On
 * desktop it shows the first palette key that works where the page runs,
 * such as ⌘K on a Mac and Ctrl K elsewhere, so the row teaches the key. A
 * phone shows no key.
 */
export function SearchRow(props: { variant: RowVariant }) {
  const palette = usePalette()
  const { platform } = useServices()
  const key = useShortcutKey('command-palette')
  const hint = useViewport() === 'phone' ? undefined : key
  return (
    <button
      aria-haspopup="dialog"
      aria-keyshortcuts={hint === undefined ? undefined : ariaShortcut(hint)}
      className={classes(
        links.row,
        props.variant === 'page' && links.page,
        ui.plainButton,
        ui.focusable,
      )}
      onClick={() => palette.show()}
      type="button"
    >
      <Search aria-hidden className={links.icon} size={14} />
      Search
      {hint === undefined ? null : (
        <kbd aria-hidden className={links.keys}>
          {rowKey(hint, platform)}
        </kbd>
      )}
    </button>
  )
}
