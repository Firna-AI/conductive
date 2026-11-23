import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDismiss } from './dismiss'
import { Menu, type MenuEntry, type MenuPoint } from './Menu'
import { Sheet } from './overlays'

/** A menu that opens at a point of the window, with its title. */
export interface OpenMenu {
  title: string
  at: MenuPoint
  entries: readonly MenuEntry[]
}

/**
 * A menu at a point, above the page, so no part that clips what it holds
 * cuts it. Escape or a press outside closes it. The menu of the browser
 * stays shut over it, also when a browser sends its menu event to the focus
 * after the keys that opened this menu.
 */
function MenuAtPoint(props: { menu: OpenMenu; onClose: () => void }) {
  const { menu } = props
  const frame = useRef<HTMLDivElement>(null)
  useDismiss(frame, true, props.onClose)
  return createPortal(
    <div onContextMenu={(event) => event.preventDefault()} ref={frame}>
      <Menu
        entries={menu.entries}
        label={menu.title}
        onClose={props.onClose}
        placement={menu.at}
      />
    </div>,
    document.body,
  )
}

/**
 * An open menu at its point on a computer, and on a phone in a sheet with
 * its title, as the mockups draw the menus of a tab and of the marks of
 * explanations.
 */
export function PointMenu(props: {
  menu: OpenMenu
  mobile: boolean
  onClose: () => void
}) {
  const { menu } = props
  if (!props.mobile) return <MenuAtPoint menu={menu} onClose={props.onClose} />
  return (
    <Sheet onClose={props.onClose} title={menu.title}>
      <Menu
        entries={menu.entries}
        label={menu.title}
        onClose={props.onClose}
        placement="sheet"
      />
    </Sheet>
  )
}
