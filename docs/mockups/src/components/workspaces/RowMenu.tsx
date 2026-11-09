import { MoreHorizontal } from 'lucide-react'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
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
 * The open menu of a row: at the pointer of a right click, or below More.
 * `label` is the name of the workspace.
 */
export type RowMenuOpen = {
  at: 'pointer' | 'more'
  label: string
  entries: readonly MenuEntry[]
  submenu?: OpenSubmenu
}

/**
 * What a row shows beside its link. A row whose person can use one of its
 * actions has More. A phone shows More on every such row and draws an open
 * menu as a sheet, so the row draws only the pressed More.
 */
export type RowControls = {
  more: boolean
  /** The screen has no hover, so More shows on every row. */
  touch: boolean
  /** The page that More opens, when the mockups draw it. */
  moreTo?: string
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

/**
 * More, the button of the menu of a row, beside the link of the row. It
 * opens the same menu as a right click, below itself on desktop.
 */
export function RowMore(props: { name: string; controls: RowControls }) {
  const { controls } = props
  const open = controls.open !== undefined
  const button = (
    <IconButton
      expanded={open}
      icon={MoreHorizontal}
      label={`More for ${props.name}`}
      menu
      quiet
    />
  )
  return (
    <span className={classes(styles.more, open && styles.moreOpen)}>
      {controls.moreTo && !open ? (
        <ScreenLink asChild to={controls.moreTo}>
          {button}
        </ScreenLink>
      ) : (
        button
      )}
      {controls.open?.at === 'more' && !controls.touch ? (
        <Menu
          entries={controls.open.entries}
          label={controls.open.label}
          placement="below-end"
        />
      ) : null}
    </span>
  )
}

/** The menu of a right click, drawn in place on desktop. */
export function RowPointMenu(props: { controls: RowControls }) {
  const { open, touch } = props.controls
  if (!open || open.at !== 'pointer' || touch) return null
  return <PointMenu menu={open} />
}
