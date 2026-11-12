import { useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { MenuPlacement } from '../../../docs/mockups/src/components/common/Menu'
import { useMenuLayer } from './layers'
import { MenuList } from './MenuList'
import { useDismiss } from './Overlay'
import { PopoverSurface } from './PopoverSurface'
import { Sheet } from './Sheet'
import { useViewport } from './viewport'
import ui from './ui.module.css'

export type MenuAction = {
  kind: 'item'
  label: string
  onSelect: () => void
  /**
   * What the item stands for, such as a section, when two items can have
   * the same label. Else the label names the item.
   */
  id?: string
  icon?: LucideIcon
  /** A mark in place of the icon, such as an avatar. */
  mark?: ReactNode
  /** Muted text after the label, such as a time. */
  detail?: string
  /** A choice in a group: the menu marks the current one. */
  checked?: boolean
  tone?: 'danger'
  disabled?: boolean
}

/**
 * An item that shows choices: beside the menu at a point, or in place of
 * the menu in a phone sheet. The owner of the menu draws the choices.
 */
export type MenuSubmenu = {
  kind: 'submenu'
  id: string
  label: string
  icon?: LucideIcon
}

/**
 * A setting that is on or off, with a switch at the end of its row, such as
 * Fast in the model menu. A change keeps the menu open, so the switch shows
 * its new state in place.
 */
export type MenuSwitch = {
  kind: 'switch'
  label: string
  on: boolean
  onToggle: () => void
}

export type MenuEntry =
  | MenuAction
  | MenuSubmenu
  | MenuSwitch
  | { kind: 'label'; label: string }
  | { kind: 'note'; text: string }
  | { kind: 'divider' }

export interface MenuTriggerState {
  open: boolean
  toggle: () => void
}

/**
 * The menu keeps its own width and its own height limit, `max-height: 70dvh`
 * in its CSS. The surface then limits it only to the room beside its
 * trigger, and does not widen it to the width of the trigger.
 */
const SURFACE_OPTIONS = {
  anchorWidthAsMinimum: false,
  maxHeight: Number.POSITIVE_INFINITY,
}

/**
 * A trigger and its menu. Desktop opens the menu beside the trigger, in the
 * top layer, so no box clips it. It opens on the side of its placement when
 * it fits there, otherwise on the side with more room. A phone opens it as a
 * sheet. A press outside or Escape closes it.
 */
export function MenuButton(props: {
  label: string
  entries: readonly MenuEntry[]
  trigger: (state: MenuTriggerState) => ReactNode
  placement?: Exclude<MenuPlacement, 'sheet'>
  wide?: boolean
  /** The title of the phone sheet. It defaults to the label. */
  sheetTitle?: string
  className?: string
}) {
  const viewport = useViewport()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = () => setOpen(false)
  const phone = viewport === 'phone'
  const placement = props.placement ?? 'below-end'
  useDismiss(open && !phone, anchor, close)
  // The palette key closes a desktop menu, which always closes. A phone
  // sheet holds the key.
  useMenuLayer(open && !phone, () => {
    close()
    return true
  })
  return (
    <span className={props.className ?? ui.anchor} ref={anchor}>
      {props.trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && !phone ? (
        <PopoverSurface
          align={placement.endsWith('end') ? 'end' : 'start'}
          anchor={anchor}
          className={ui.menuLayer}
          options={SURFACE_OPTIONS}
          side={placement.startsWith('above') ? 'above' : 'below'}
        >
          <MenuList
            close={close}
            entries={props.entries}
            label={props.label}
            placement="anchored"
            wide={props.wide}
          />
        </PopoverSurface>
      ) : null}
      {open && phone ? (
        <Sheet close={close} title={props.sheetTitle ?? props.label}>
          <MenuList
            close={close}
            entries={props.entries}
            label={props.label}
            placement="sheet"
          />
        </Sheet>
      ) : null}
    </span>
  )
}
