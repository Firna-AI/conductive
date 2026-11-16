import { Menu, type MenuEntry } from './Menu'
import styles from './PointMenu.module.css'

/** The choices of an open submenu, beside its item of the menu. */
export type OpenSubmenu = {
  label: string
  entries: readonly MenuEntry[]
  /** The place of its item among the items of the menu: first or second. */
  item: 0 | 1
  wide?: boolean
}

/**
 * The menu of a right click at a pointer over a row, such as a workspace
 * row or a row of All files. A view runs no script, so the menu stands in
 * the row, which places it. Its top left corner takes the point, and an
 * open submenu sits beside it, level with its item.
 */
export function PointMenu(props: {
  label: string
  entries: readonly MenuEntry[]
  submenu?: OpenSubmenu
}) {
  const { submenu } = props
  return (
    <span className={styles.pointer}>
      <Menu entries={props.entries} label={props.label} placement="point" />
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
