import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import type { MenuPlacement } from '../../../docs/mockups/src/components/common/Menu'
import menu from '../../../docs/mockups/src/components/common/Menu.module.css'
import { useMenuLayer } from './layers'
import { useDismiss, useLayerFocus } from './Overlay'
import { Sheet } from './Sheet'
import { useViewport } from './viewport'
import ui from './ui.module.css'

export type MenuAction = {
  kind: 'item'
  label: string
  onSelect: () => void
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

export type MenuEntry =
  | MenuAction
  | { kind: 'label'; label: string }
  | { kind: 'note'; text: string }
  | { kind: 'divider' }

function moveFocus(event: KeyboardEvent<HTMLDivElement>, close: () => void) {
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      '[role^="menuitem"]:not(:disabled)',
    ),
  )
  const at = items.findIndex((item) => item === document.activeElement)
  const last = items.length - 1
  const targets: Record<string, number> = {
    ArrowDown: at >= last ? 0 : at + 1,
    ArrowUp: at <= 0 ? last : at - 1,
    Home: 0,
    End: last,
  }
  if (event.key === 'Tab') close()
  const target = targets[event.key]
  if (target === undefined) return
  event.preventDefault()
  items[target]?.focus()
}

function Item(props: { entry: MenuAction; close: () => void }) {
  const { entry } = props
  const Icon = entry.icon
  const choice = entry.checked !== undefined
  let lead: ReactNode = null
  if (entry.mark) lead = <span className={menu.mark}>{entry.mark}</span>
  else if (Icon) lead = <Icon aria-hidden className={menu.icon} size={14} />
  return (
    <button
      aria-checked={choice ? entry.checked : undefined}
      className={classes(
        menu.item,
        ui.plainButton,
        ui.menuItem,
        entry.tone === 'danger' && menu.danger,
      )}
      disabled={entry.disabled}
      onClick={() => {
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

/** An open menu. The arrow keys move between its items. */
export function MenuList(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: MenuPlacement
  close: () => void
  wide?: boolean
}) {
  const list = useRef<HTMLDivElement>(null)
  // A menu in a sheet leaves the focus to the sheet, which is modal.
  useLayerFocus(list, { modal: false, enabled: props.placement !== 'sheet' })
  return (
    <div
      aria-label={props.label}
      className={classes(
        menu.menu,
        menu[props.placement],
        props.wide && menu.wide,
      )}
      onKeyDown={(event) => moveFocus(event, props.close)}
      ref={list}
      role="menu"
    >
      {props.entries.map((entry, index) => {
        switch (entry.kind) {
          case 'item':
            return <Item close={props.close} entry={entry} key={entry.label} />
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

export interface MenuTriggerState {
  open: boolean
  toggle: () => void
}

/**
 * A trigger and its menu. Desktop opens the menu beside the trigger, and a
 * phone opens it as a sheet. A press outside or Escape closes it.
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
        <MenuList
          close={close}
          entries={props.entries}
          label={props.label}
          placement={props.placement ?? 'below-end'}
          wide={props.wide}
        />
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
