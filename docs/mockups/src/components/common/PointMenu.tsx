import { defined } from '../../defined'
import { menu as menuPart } from '../../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import styles from './PointMenu.module.css'

/** The choices of an open submenu, beside its item of the menu. */
export type OpenSubmenu = {
  label: string
  entries: readonly MenuEntryData[]
  /** The place of its item among the items of the menu: first or second. */
  item: 0 | 1
  wide?: boolean
}

/**
 * The menu of a right click at a pointer over a row, such as a workspace
 * row or a row of All files. A view runs no script, so the menu stands in
 * the row, which places it. Its top left corner takes the point, and an
 * open submenu sits beside it, level with its item. The entries are JSON,
 * with the key of each icon, as the registered menu takes them.
 */
export function PointMenu(props: {
  label: string
  entries: readonly MenuEntryData[]
  submenu?: OpenSubmenu
}) {
  const { submenu } = props
  return (
    <span className={styles.pointer}>
      <menuPart.Component
        entries={props.entries}
        label={props.label}
        moklyInstance="row-menu"
        placement="point"
      />
      {submenu ? (
        <span className={submenu.item === 1 ? styles.second : undefined}>
          <menuPart.Component
            entries={submenu.entries}
            label={submenu.label}
            moklyInstance="row-submenu"
            placement="point"
            {...defined({ wide: submenu.wide })}
          />
        </span>
      ) : null}
    </span>
  )
}
