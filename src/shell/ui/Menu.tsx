import { useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { MenuPlacement } from '../../ui/components/common/Menu'
import { ownPress } from '../../app/pointer-drag'
import { useMenuLayer } from './layers'
import { OpenMenu } from './OpenMenu'
import { useDismiss } from './Overlay'
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
  /**
   * Muted words that follow the label in its line, such as the effort of a
   * favourite after its model.
   */
  muted?: string
  /** A choice in a group: the menu marks the current one. */
  checked?: boolean
  tone?: 'danger'
  disabled?: boolean
}

/**
 * An item that shows choices: beside the menu, or in place of the menu in
 * a phone sheet and in the phone layout. `MenuButton` draws its `entries`,
 * as `OpenMenu` says. The owner of a menu at a point draws the choices.
 */
export type MenuSubmenu = {
  kind: 'submenu'
  id: string
  label: string
  icon?: LucideIcon
  /**
   * Muted words that follow the label in its line, such as the current
   * effort after Effort.
   */
  muted?: string
  /** The choices that `MenuButton` shows for the item. */
  entries?: readonly MenuRow[]
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

/** A row of a menu: each entry but an item that shows choices. */
export type MenuRow =
  | MenuAction
  | MenuSwitch
  | { kind: 'label'; label: string }
  | { kind: 'note'; text: string }
  | { kind: 'divider' }

export type MenuEntry = MenuRow | MenuSubmenu

export interface MenuTriggerState {
  open: boolean
  toggle: () => void
  /** The menu is busy, as `MenuButton` says, so the trigger shows as off. */
  busy: boolean
}

/**
 * A trigger and its menu. Desktop opens the menu beside the trigger, in the
 * top layer, so no box clips it. It opens on the side of its placement when
 * it fits there, otherwise on the side with more room. A phone opens it as a
 * sheet, or beside the trigger with `besideOnPhone`. A press outside or
 * Escape closes it. An item with a submenu shows its choices as `OpenMenu`
 * says. The trigger and its menu keep their own presses, so a press on them
 * starts no drag of a row around them.
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
  /**
   * A change of the owner runs, such as a save after a switch row that kept
   * the menu open. The trigger shows as off. The open menu stays open with
   * its rows off, as `MenuList` says. A press outside or Escape still
   * closes it.
   */
  busy?: boolean
  /**
   * The phone layout also opens the menu beside the trigger, not as a
   * sheet, as each model picker does (model favourites decision 5 B). The
   * choices of an item then take the place of the menu.
   */
  besideOnPhone?: boolean
}) {
  const viewport = useViewport()
  const [open, setOpen] = useState(false)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = () => setOpen(false)
  const phone = viewport === 'phone'
  const sheet = phone && props.besideOnPhone !== true
  const placement = props.placement ?? 'below-end'
  const busy = props.busy ?? false
  useDismiss(open && !sheet, anchor, close)
  // The palette key closes a menu beside its trigger, which always closes.
  // A phone sheet holds the key.
  useMenuLayer(open && !sheet, () => {
    close()
    return true
  })
  return (
    <span {...ownPress} className={props.className ?? ui.anchor} ref={anchor}>
      {props.trigger({ open, toggle: () => setOpen((value) => !value), busy })}
      {open && !sheet ? (
        <OpenMenu
          busy={busy}
          close={close}
          entries={props.entries}
          inPlace={phone}
          label={props.label}
          place={{ anchor, placement }}
          wide={props.wide}
        />
      ) : null}
      {open && sheet ? (
        <Sheet close={close} title={props.sheetTitle ?? props.label}>
          <OpenMenu
            busy={busy}
            close={close}
            entries={props.entries}
            inPlace
            label={props.label}
            place="sheet"
          />
        </Sheet>
      ) : null}
    </span>
  )
}
