import type { ReactNode } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import menu from '../../ui/components/common/Menu.module.css'
import { SwitchPicture } from '../../ui/components/common/SwitchPicture'
import type { MenuAction, MenuSubmenu, MenuSwitch } from './Menu'
import type { SubmenuControl } from './MenuList'
import ui from './ui.module.css'

/**
 * The row of an action or a choice: its icon or mark, its label with its
 * muted words, its detail, and the check of the current choice. A press
 * runs `select`. While `busy`, the row is off: it fades, a screen reader
 * hears it as off, and a press does nothing, but it keeps the focus.
 */
export function ActionItem(props: {
  entry: MenuAction
  select: () => void
  busy: boolean
}) {
  const { entry, busy } = props
  const Icon = entry.icon
  const choice = entry.checked !== undefined
  let lead: ReactNode = null
  if (entry.mark) lead = <span className={menu.mark}>{entry.mark}</span>
  else if (Icon) lead = <Icon aria-hidden className={menu.icon} size={14} />
  return (
    <button
      aria-checked={choice ? entry.checked : undefined}
      aria-disabled={busy || undefined}
      className={classes(
        menu.item,
        ui.plainButton,
        ui.menuItem,
        entry.tone === 'danger' && menu.danger,
        (entry.disabled || busy) && menu.disabled,
      )}
      disabled={entry.disabled}
      onClick={() => {
        if (!busy) props.select()
      }}
      role={choice ? 'menuitemradio' : 'menuitem'}
      tabIndex={-1}
      type="button"
    >
      {lead}
      <span className={menu.label}>
        {entry.label}
        {entry.muted ? (
          <span className={menu.muted}> {entry.muted}</span>
        ) : null}
      </span>
      {entry.detail ? (
        <span className={menu.detail}>{entry.detail}</span>
      ) : null}
      {entry.checked ? (
        <Check aria-hidden className={menu.check} size={14} />
      ) : null}
    </button>
  )
}

/**
 * The row of a switch: its label and the switch, as the mockup draws it. A
 * press changes it, and the menu stays open.
 */
export function SwitchItem(props: { entry: MenuSwitch; busy: boolean }) {
  const { entry, busy } = props
  return (
    <button
      aria-checked={entry.on}
      aria-disabled={busy || undefined}
      className={classes(
        menu.item,
        ui.plainButton,
        ui.menuItem,
        busy && menu.disabled,
      )}
      onClick={() => {
        if (!busy) entry.onToggle()
      }}
      role="menuitemcheckbox"
      tabIndex={-1}
      type="button"
    >
      <span className={menu.label}>{entry.label}</span>
      <SwitchPicture on={entry.on} />
    </button>
  )
}

/**
 * An item that shows its choices: beside the menu, or in place of the menu
 * in a sheet and in the phone layout. Its muted words follow its label, and
 * an arrow at its end says that it has choices. Its open
 * choices keep it highlighted. While `busy`, it is off as an action is, and
 * shows no choices.
 */
export function SubmenuItem(props: {
  entry: MenuSubmenu
  submenus?: SubmenuControl
  busy: boolean
}) {
  const { entry, submenus, busy } = props
  const Icon = entry.icon
  const open = submenus?.open === entry.id
  return (
    <button
      aria-disabled={busy || undefined}
      aria-expanded={open}
      aria-haspopup="menu"
      className={classes(
        menu.item,
        ui.plainButton,
        ui.menuItem,
        open && menu.highlighted,
        busy && menu.disabled,
      )}
      data-submenu={entry.id}
      onClick={() => {
        if (!busy) submenus?.show(entry.id, true)
      }}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      {Icon ? <Icon aria-hidden className={menu.icon} size={14} /> : null}
      <span className={menu.label}>
        {entry.label}
        {entry.muted ? (
          <span className={menu.muted}> {entry.muted}</span>
        ) : null}
      </span>
      <ChevronRight aria-hidden className={menu.icon} size={14} />
    </button>
  )
}
