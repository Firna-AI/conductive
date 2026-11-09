import { Menu, type MenuEntry } from '../common/Menu'
import styles from './RowMenu.module.css'

/** The choices of an open submenu, beside its item of the menu. */
export type OpenSubmenu = {
  label: string
  entries: readonly MenuEntry[]
  /** The place of its item among the items of the menu: first or second. */
  item: 0 | 1
  wide?: boolean
}

/**
 * The open menu of a row, which a right click or the menu keys opened: at
 * the pointer, or in a sheet that the screen draws, as on a phone. `label`
 * is the name of the workspace.
 */
export type RowMenuOpen = {
  at: 'pointer' | 'sheet'
  label: string
  entries: readonly MenuEntry[]
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
 * The menu of a right click at a pointer over the name of the row. Its top
 * left corner takes the point, and an open submenu sits beside it, level
 * with its item.
 */
function PointMenu(props: { menu: RowMenuOpen }) {
  const { menu } = props
  const { submenu } = menu
  return (
    <span className={styles.pointer}>
      <Menu entries={menu.entries} label={menu.label} placement="point" />
      {submenu ? (
        <span className={submenu.item === 1 ? styles.second : undefined}>
          <Menu
            entries={submenu.entries}
            label={submenu.label}
            placement="point"
            wide={submenu.wide}
          />
        </span>
      ) : null}
    </span>
  )
}

/** The menu of a right click, drawn in place at the pointer on desktop. */
export function RowPointMenu(props: { controls: RowControls }) {
  const { open } = props.controls
  if (open?.at !== 'pointer') return null
  return <PointMenu menu={open} />
}
