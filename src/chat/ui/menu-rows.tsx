import type { KeyboardEvent, ReactNode } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import a11y from '../../ui/components/common/a11y.module.css'
import { classes } from '../../ui/components/common/classes'
import { KeyChips } from '../../ui/components/common/KeyChips'
import styles from '../../ui/components/common/Menu.module.css'
import { SwitchPicture } from '../../ui/components/common/SwitchPicture'
import controls from './controls.module.css'
import type { MenuEntry, MenuItem, MenuSubmenu, MenuSwitch } from './Menu'

/** The items that the keyboard reaches: the items that are on. */
const ITEM = [
  '[role="menuitem"]:not(:disabled)',
  '[role="menuitemradio"]:not(:disabled)',
  '[role="menuitemcheckbox"]:not(:disabled)',
].join(', ')

/** The submenu of a menu that shows, and what shows a submenu. */
export interface SubmenuControl {
  /** The key of the item whose submenu shows, if any. */
  open: string | null
  /**
   * Shows the submenu of an item. With `focus`, as after a key or a press,
   * the focus goes into it. A hover leaves the focus in the menu.
   */
  show: (key: string, focus: boolean) => void
}

/**
 * The item of a menu that takes the focus: the checked one, else the first.
 * It reads the attribute, which each browser and happy-dom keep.
 */
export function firstItem(menu: HTMLElement): HTMLElement | null {
  const items = [...menu.querySelectorAll<HTMLElement>(ITEM)]
  const checked = items.find(
    (item) => item.getAttribute('aria-checked') === 'true',
  )
  return checked ?? items[0] ?? null
}

/** The item of the menu of an event that holds its target, if any. */
export function itemAt(event: {
  target: EventTarget
  currentTarget: HTMLElement
}): HTMLElement | null {
  const { target } = event
  if (!(target instanceof Element)) return null
  const item = target.closest<HTMLElement>(ITEM)
  return item && event.currentTarget.contains(item) ? item : null
}

/**
 * Moves the focus between the items of the menu of the event: the arrow
 * keys go to the next or the previous item, with a wrap at each end, and
 * Home and End to the first and the last. They skip the items that are
 * off, as the menus of the design system do. Says whether the key moved
 * the focus.
 */
export function moveFocus(event: KeyboardEvent<HTMLElement>): boolean {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(ITEM)]
  const index = items.findIndex((item) => item === document.activeElement)
  let next: HTMLElement | undefined
  if (event.key === 'ArrowDown') next = items[(index + 1) % items.length]
  else if (event.key === 'ArrowUp') {
    next = items[(index - 1 + items.length) % items.length]
  } else if (event.key === 'Home') next = items[0]
  else if (event.key === 'End') next = items.at(-1)
  if (!next) return false
  event.preventDefault()
  next.focus()
  return true
}

function Item(props: { entry: MenuItem }) {
  const { entry } = props
  const Icon = entry.icon
  const Trailing = entry.trailingIcon
  const choice = entry.checked !== undefined
  let lead: ReactNode = null
  if (entry.mark) lead = <span className={styles.mark}>{entry.mark}</span>
  else if (Icon) lead = <Icon aria-hidden className={styles.icon} size={14} />
  return (
    <button
      aria-checked={choice ? entry.checked : undefined}
      className={classes(
        controls.bare,
        styles.item,
        controls.row,
        entry.disabled && styles.disabled,
      )}
      disabled={entry.disabled}
      onClick={entry.onSelect}
      role={choice ? 'menuitemradio' : 'menuitem'}
      tabIndex={-1}
      type="button"
    >
      {lead}
      <span className={styles.label}>
        {entry.label}
        {entry.muted ? (
          <span className={styles.muted}> {entry.muted}</span>
        ) : null}
      </span>
      {entry.detail ? (
        <span className={styles.detail}>{entry.detail}</span>
      ) : null}
      {Trailing ? (
        <Trailing aria-hidden className={styles.icon} size={14} />
      ) : null}
      {entry.trailingLabel ? (
        <span className={a11y.hidden}>{entry.trailingLabel}</span>
      ) : null}
      {entry.checked ? (
        <Check aria-hidden className={styles.check} size={14} />
      ) : null}
    </button>
  )
}

/**
 * The row of a switch: its label, the key of its command, and the switch,
 * as the mockup draws it. A click, Enter, or Space changes it. The row
 * names its key to a screen reader, so the key chips are hidden from it.
 */
function SwitchItem(props: { entry: MenuSwitch }) {
  const { entry } = props
  return (
    <button
      aria-checked={entry.on}
      aria-keyshortcuts={entry.shortcut?.aria}
      className={classes(controls.bare, styles.item, controls.row)}
      onClick={entry.onToggle}
      role="menuitemcheckbox"
      tabIndex={-1}
      type="button"
    >
      <span className={styles.label}>{entry.label}</span>
      {entry.shortcut ? (
        <span aria-hidden className={styles.keys}>
          <KeyChips shortcut={entry.shortcut.tokens} />
        </span>
      ) : null}
      <SwitchPicture on={entry.on} />
    </button>
  )
}

/**
 * An item that shows its submenu, with its muted words and an arrow at its
 * end. A press, Enter,
 * Space, and the right arrow show it and move the focus into it. Its open
 * submenu keeps it highlighted.
 */
function SubmenuItem(props: { entry: MenuSubmenu; submenu?: SubmenuControl }) {
  const { entry, submenu } = props
  const open = submenu?.open === entry.key
  return (
    <button
      aria-expanded={open}
      aria-haspopup="menu"
      className={classes(
        controls.bare,
        styles.item,
        controls.row,
        open && styles.highlighted,
      )}
      data-submenu={entry.key}
      onClick={() => submenu?.show(entry.key, true)}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      <span className={styles.label}>
        {entry.label}
        {entry.muted ? (
          <span className={styles.muted}> {entry.muted}</span>
        ) : null}
      </span>
      <ChevronRight aria-hidden className={styles.icon} size={14} />
    </button>
  )
}

/**
 * The rows of a menu, in the dense rows of the mockups. `submenu` says
 * which item shows its submenu, and shows one.
 */
export function MenuRows(props: {
  entries: readonly MenuEntry[]
  submenu?: SubmenuControl
}) {
  return (
    <>
      {props.entries.map((entry, index) => {
        switch (entry.kind) {
          case 'item':
            return <Item entry={entry} key={entry.key} />
          case 'switch':
            return <SwitchItem entry={entry} key={entry.key} />
          case 'submenu':
            return (
              <SubmenuItem
                entry={entry}
                key={entry.key}
                submenu={props.submenu}
              />
            )
          case 'label':
            return (
              <div className={styles.group} key={entry.label} role="none">
                {entry.label}
              </div>
            )
          case 'note':
            return (
              <p className={styles.note} key={`note-${index}`} role="none">
                {entry.text}
              </p>
            )
          case 'divider':
            return <hr className={styles.divider} key={`divider-${index}`} />
        }
      })}
    </>
  )
}
