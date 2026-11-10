import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDismiss } from '../ui/dismiss'
import { Menu } from '../ui/Menu'
import { Sheet } from '../ui/overlays'
import type { OpenTabMenu } from './useTabMenu'

/**
 * The menu of a tab at a point, above the page, because the row clips what
 * it holds. Escape or a press outside closes it. The menu of the browser
 * stays shut over it, also when a browser sends its menu event to the focus
 * after the keys that opened this menu.
 */
function PointMenu(props: { menu: OpenTabMenu; onClose: () => void }) {
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
 * The open menu of a tab: at its point on desktop, and on a phone in a sheet
 * with the title of the tab, as the mockups draw it.
 */
export function TabMenu(props: {
  menu: OpenTabMenu
  mobile: boolean
  onClose: () => void
}) {
  const { menu } = props
  if (!props.mobile) return <PointMenu menu={menu} onClose={props.onClose} />
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
