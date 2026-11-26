import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import { PointMenu, type OpenSubmenu } from '../common/PointMenu'

/**
 * The open menu of a row, which a right click or the menu keys opened: at
 * the pointer, or in a sheet that the screen draws, as on a phone. `label`
 * is the name of the workspace.
 */
export type RowMenuOpen = {
  at: 'pointer' | 'sheet'
  label: string
  entries: readonly MenuEntryData[]
  submenu?: OpenSubmenu
}

/** What a view draws on a row: its open menu, the field of Rename, or a hover. */
export type RowControls = {
  open?: RowMenuOpen
  /** A field in place of the name and the time, after Rename. */
  rename?: { value: string; selected: boolean }
  /** A view runs no script, so it draws the fill of a hover. */
  hovered?: boolean
}

/**
 * The menu of a right click, drawn in place at the pointer over the name of
 * the row on desktop.
 */
export function RowPointMenu(props: { controls: RowControls }) {
  const { open } = props.controls
  if (open?.at !== 'pointer') return null
  return (
    <PointMenu
      entries={open.entries}
      label={open.label}
      submenu={open.submenu}
    />
  )
}
