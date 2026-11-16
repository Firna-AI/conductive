import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import type { MenuPlacement } from '../../../docs/mockups/src/components/common/Menu'
import menu from '../../../docs/mockups/src/components/common/Menu.module.css'
import { SwitchPicture } from '../../../docs/mockups/src/components/common/SwitchPicture'
import type { MenuAction, MenuEntry, MenuSubmenu, MenuSwitch } from './Menu'
import { useLayerFocus } from './Overlay'
import ui from './ui.module.css'

/** The items of a menu that take the focus: the items that are on. */
const ITEM = '[role^="menuitem"]:not(:disabled)'

/**
 * Where a list draws: beside its trigger, at a point, or in a sheet.
 * `anchored` is a list in a `PopoverSurface`, which places it beside its
 * trigger.
 */
export type ListPlacement = MenuPlacement | 'point' | 'anchored'

/** The choices of the items with a submenu, and how they opened. */
export interface SubmenuControl {
  /** The submenu whose choices show, if any. */
  open: string | null
  /**
   * Shows the choices of a submenu, or closes them with null. With `focus`,
   * as after a key or a press, the focus goes into the choices. A hover
   * leaves the focus in the menu.
   */
  show: (id: string | null, focus: boolean) => void
}

function moveFocus(
  event: KeyboardEvent<HTMLDivElement>,
  close: () => void,
  point: boolean,
) {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(ITEM),
  )
  const at = items.findIndex((item) => item === document.activeElement)
  const last = items.length - 1
  const targets: Record<string, number> = {
    ArrowDown: at >= last ? 0 : at + 1,
    ArrowUp: at <= 0 ? last : at - 1,
    Home: 0,
    End: last,
  }
  if (event.key === 'Tab') {
    // A menu at a point has no place in the order of Tab: the focus goes
    // back to what opened it.
    if (point) event.preventDefault()
    close()
  }
  const target = targets[event.key]
  if (target === undefined) return
  event.preventDefault()
  items[target]?.focus()
}

function Item(props: { entry: MenuAction; close: () => void; busy: boolean }) {
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
        if (busy) return
        props.close()
        entry.onSelect()
      }}
      role={choice ? 'menuitemradio' : 'menuitem'}
      tabIndex={-1}
      type="button"
    >
      {lead}
      <span className={menu.label}>{entry.label}</span>
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
function SwitchItem(props: { entry: MenuSwitch; busy: boolean }) {
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
 * An item that shows its choices: beside the menu at a point, or in place
 * of the menu in a sheet. An arrow at its end says so. Its open choices
 * keep it highlighted.
 */
function SubmenuItem(props: { entry: MenuSubmenu; submenus?: SubmenuControl }) {
  const { entry, submenus } = props
  const Icon = entry.icon
  const open = submenus?.open === entry.id
  return (
    <button
      aria-expanded={open}
      aria-haspopup="menu"
      className={classes(
        menu.item,
        ui.plainButton,
        ui.menuItem,
        open && menu.highlighted,
      )}
      data-submenu={entry.id}
      onClick={() => submenus?.show(entry.id, true)}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      {Icon ? <Icon aria-hidden className={menu.icon} size={14} /> : null}
      <span className={menu.label}>{entry.label}</span>
      <ChevronRight aria-hidden className={menu.icon} size={14} />
    </button>
  )
}

/** The item of the list under the pointer, if any. */
function itemAt(event: PointerEvent<HTMLDivElement>): HTMLElement | null {
  const { target } = event
  if (!(target instanceof Element)) return null
  const item = target.closest<HTMLElement>(ITEM)
  return item && event.currentTarget.contains(item) ? item : null
}

/**
 * An open menu. The arrow keys move between its items. Right arrow and a
 * press on an item with a submenu show its choices. At a point, the item
 * under the pointer takes the focus, so one row shows the highlight, and a
 * hover shows the choices of an item, or closes the choices of another.
 * With `focus`, the list moves the focus into itself as it opens and back
 * as it closes. A list in a sheet leaves the focus to the sheet, which is
 * modal, and a menu at a point moves the focus itself.
 *
 * While `busy`, each item and each switch is off: it fades, a screen reader
 * hears it as off, and a press does nothing. It can still take the focus,
 * so the focus stays in the list, and the arrow keys still move it.
 */
export function MenuList(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: ListPlacement
  close: () => void
  wide?: boolean
  submenus?: SubmenuControl
  focus?: boolean
  busy?: boolean
}) {
  const list = useRef<HTMLDivElement>(null)
  const { placement, submenus } = props
  const busy = props.busy ?? false
  const point = placement === 'point'
  useLayerFocus(list, {
    modal: false,
    enabled: props.focus ?? placement !== 'sheet',
  })
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement
    const id = active instanceof HTMLElement ? active.dataset.submenu : null
    if (event.key === 'ArrowRight' && id && submenus) {
      event.preventDefault()
      submenus.show(id, true)
      return
    }
    moveFocus(event, props.close, point)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!point) return
    const item = itemAt(event)
    if (!item) return
    if (item !== document.activeElement) item.focus({ preventScroll: true })
    const id = item.dataset.submenu ?? null
    if (submenus && submenus.open !== id) submenus.show(id, false)
  }
  return (
    <div
      aria-label={props.label}
      className={classes(
        menu.menu,
        placement === 'anchored' ? ui.anchoredMenu : menu[placement],
        props.wide && menu.wide,
      )}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      ref={list}
      role="menu"
    >
      {props.entries.map((entry, index) => {
        switch (entry.kind) {
          case 'item':
            return (
              <Item
                busy={busy}
                close={props.close}
                entry={entry}
                key={entry.id ?? entry.label}
              />
            )
          case 'submenu':
            return (
              <SubmenuItem entry={entry} key={entry.id} submenus={submenus} />
            )
          case 'switch':
            return <SwitchItem busy={busy} entry={entry} key={entry.label} />
          case 'label':
            return (
              <div className={menu.group} key={entry.label} role="none">
                {entry.label}
              </div>
            )
          case 'note':
            return (
              <p className={menu.note} key={`note-${index}`} role="none">
                {entry.text}
              </p>
            )
          case 'divider':
            return <hr className={menu.divider} key={`divider-${index}`} />
        }
      })}
    </div>
  )
}
