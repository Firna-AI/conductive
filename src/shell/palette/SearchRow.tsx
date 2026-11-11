import { Search } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import links from '../../../docs/mockups/src/components/workspaces/SidebarLinks.module.css'
import { ariaShortcut, formatShortcut } from '../../app/shortcuts/keys'
import { useServices, type Platform } from '../../app/services'
import type { ShortcutKeyText } from '../../shared/shortcut-key'
import type { RowVariant } from '../list/WorkspaceRow'
import { useShortcutKey } from '../shortcuts/shortcut-context'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { usePalette } from './palette-context'

/** The key as the row shows it: ⌘K on a Mac, and Ctrl K on Windows and Linux. */
function rowKey(key: ShortcutKeyText, keyboard: Platform): string {
  const text = formatShortcut(key, keyboard)
  if (keyboard === 'mac') return text
  return text.replace(/^(?:(?:Ctrl|Alt|Shift|Meta)\+)+/, (modifiers) =>
    modifiers.replaceAll('+', ' '),
  )
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
