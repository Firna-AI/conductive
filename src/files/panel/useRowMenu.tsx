import {
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefCallback,
} from 'react'
import { useLongPress } from '../../app/long-press'
import { belowRow, type MenuOpening } from '../../shell/list/row-menu'
import type { MenuEntry } from '../../shell/ui/Menu'
import { MenuList } from '../../shell/ui/MenuList'
import { opensMenu } from '../../shell/ui/menu-keys'
import type { MenuAnchor } from '../../shell/ui/menu-place'
import { PointMenu } from '../../shell/ui/PointMenu'
import { Sheet } from '../../shell/ui/Sheet'
import { useFilesLayout } from '../ui/layout'
import { menuEntries, type MenuRow, type RowMenuItems } from './row-menu'
import styles from './RowMenu.module.css'

/** The open menu of a list: the real path of its row, and how it opened. */
type OpenMenu = MenuOpening & { path: string }

/**
 * What the control of a row takes from the menu of its list. A row with no
 * item gets no handler and no class, so the browser shows its own menu.
 */
export interface RowMenuBinding {
  /** The menu of the row is open, so the row keeps the fill of a hover. */
  open: boolean
  /** The class of a row that a finger can hold, if any. */
  className: string | undefined
  handlers: Pick<
    HTMLAttributes<HTMLElement>,
    'onContextMenu' | 'onKeyDown' | 'onPointerDown'
  >
  /** The control, which takes the focus back as its menu closes. */
  ref: RefCallback<HTMLElement>
}

const noMenu: RowMenuBinding['handlers'] = {}

/**
 * The open row menu: at its point on desktop, or on a phone in a sheet
 * with the name of the row as its title. A press on an item closes it
 * first, then runs the item.
 */
function RowMenuLayer(props: {
  name: string
  entries: readonly MenuEntry[]
  opening: MenuOpening
  phone: boolean
  close: () => void
}) {
  const { name, entries, opening, close } = props
  if (!props.phone) {
    return (
      <PointMenu
        anchor={opening.anchor}
        back={opening.back}
        choices={null}
        close={() => {
          close()
          return true
        }}
        entries={entries}
        label={name}
        showChoices={() => false}
      />
    )
  }
  return (
    <Sheet close={close} returnFocus={opening.back} title={name}>
      <MenuList
        close={close}
        entries={entries}
        label={name}
        placement="sheet"
      />
    </Sheet>
  )
}

/**
 * The row menu of a list of the Files panel, as
 * [File row menu](../../../docs/protocol/file-row-menu.md) says. A right
 * click opens it at the pointer. Shift and F10, or the Menu key, opens it
 * below the focused row. A long press of a finger that ends with no move
 * opens it as a sheet on a phone, and at the press elsewhere. A mouse binds
 * no long press, so it still selects text. Escape, Tab, or a press outside
 * closes it, and the focus goes back to the row. `items` gives the items of
 * each row, and a row with no item, such as one whose label hides a secret
 * value, opens no menu. A row that leaves the list closes its menu.
 */
export function useRowMenu(
  items: RowMenuItems | undefined,
  rows: readonly MenuRow[],
): { bind: (row: MenuRow) => RowMenuBinding; layer: ReactNode } {
  const phone = useFilesLayout() === 'phone'
  const [open, setOpen] = useState<OpenMenu | null>(null)
  const controls = useRef(new Map<string, HTMLElement>())
  const show = (path: string, anchor: MenuAnchor) =>
    setOpen({
      path,
      anchor,
      back: () => controls.current.get(path)?.focus(),
    })
  const hold = useLongPress(show)
  const entriesOf = (row: MenuRow): MenuEntry[] =>
    row.target && items ? menuEntries(items(row.target)) : []
  const openRow = open ? rows.find((row) => row.path === open.path) : undefined
  const entries = openRow ? entriesOf(openRow) : []
  // A row that leaves the list, or that keeps no item, closes its menu, so
  // the menu does not open again when the row comes back.
  if (open && entries.length === 0) setOpen(null)

  const bind = (row: MenuRow): RowMenuBinding => {
    const { path } = row
    // React detaches each old ref of a commit before it attaches the new
    // ones, so a control that a render keeps or replaces stays in the map.
    const ref: RefCallback<HTMLElement> = (node) => {
      if (node) controls.current.set(path, node)
      else controls.current.delete(path)
    }
    if (entriesOf(row).length === 0) {
      return { open: false, className: undefined, handlers: noMenu, ref }
    }
    const held = hold(path)
    const shown = open?.path === path && entries.length > 0
    return {
      open: shown,
      className: styles.hold,
      ref,
      handlers: {
        onPointerDown: held.onPointerDown,
        onContextMenu: (event) => {
          held.onContextMenu?.(event)
          // The hold stops the event while a finger holds the row, whose
          // release opens the menu.
          if (event.defaultPrevented) return
          event.preventDefault()
          // A browser can also send this event after the keys that open it.
          if (!shown) show(path, { x: event.clientX, y: event.clientY })
        },
        onKeyDown: (event) => {
          if (!opensMenu(event)) return
          event.preventDefault()
          const box = event.currentTarget.getBoundingClientRect()
          show(path, { x: box.left, y: box.bottom + belowRow })
        },
      },
    }
  }

  const layer =
    open && openRow && entries.length > 0 ? (
      <RowMenuLayer
        close={() => setOpen(null)}
        entries={entries}
        key={open.path}
        name={openRow.name}
        opening={open}
        phone={phone}
      />
    ) : null
  return { bind, layer }
}
