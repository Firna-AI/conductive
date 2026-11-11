import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import a11y from '../../../docs/mockups/src/components/common/a11y.module.css'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/common/Menu.module.css'
import controls from './controls.module.css'
import { useFocusInside } from './dismiss'
import local from './menu.module.css'

type MenuItem = {
  kind: 'item'
  key: string
  label: string
  onSelect: () => void
  icon?: LucideIcon
  /** A mark in place of the icon, such as an agent mark. */
  mark?: ReactNode
  /** Muted text after the label, such as the time of a session. */
  detail?: string
  /** An icon at the end of the row, such as the arrow that reopens. */
  trailingIcon?: LucideIcon
  /**
   * The spoken name of the trailing icon, when the icon says what the label
   * does not, such as "New session". Without it, a screen reader skips the
   * icon.
   */
  trailingLabel?: string
  /** A choice in a group: the menu marks the current one. */
  checked?: boolean
  /** An item that is off: it keeps its place, greyed, and the arrows skip it. */
  disabled?: boolean
}

export type MenuEntry =
  | MenuItem
  | { kind: 'label'; label: string }
  | { kind: 'note'; text: string }
  | { kind: 'divider' }

/** A point of the window, in CSS px, where a menu opens. */
export interface MenuPoint {
  x: number
  y: number
}

/**
 * Where a menu opens: beside its trigger, with its top left corner at a
 * point of the window, or in a phone sheet.
 */
export type MenuPlacement =
  | 'below-start'
  | 'below-end'
  | 'above-start'
  | 'above-end'
  | 'sheet'
  | MenuPoint

/** The items that the keyboard reaches: the items that are on. */
const ITEM =
  '[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)'

/** A menu at a point keeps this gap to the right and bottom of the window. */
const edge = 4

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
      <span className={styles.label}>{entry.label}</span>
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

function firstItem(menu: HTMLElement): HTMLElement | null {
  const items = [...menu.querySelectorAll<HTMLElement>(ITEM)]
  return items.find((item) => item.ariaChecked === 'true') ?? items[0] ?? null
}

/**
 * An open menu of actions or choices, in the dense rows of the mockups.
 * Beside its trigger, the trigger's wrapper sets the position that it opens
 * from. At a point, it draws above the page from its own fixed position. The
 * arrow keys move between the items that are on, and skip the items that are
 * off, as the menus of the design system do. Escape closes it. Tab closes a
 * popover, and a menu at a point gives the focus back to where it was. Tab
 * stays inside a sheet. A wide menu fits long rows, such as session titles.
 */
export function Menu(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: MenuPlacement
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { placement } = props
  const point = typeof placement === 'string' ? null : placement
  const x = point?.x
  const y = point?.y
  useFocusInside(ref, firstItem)
  // At a point, the top left corner of the menu goes there. A menu that would
  // pass the right side of the window moves left, and one that would pass
  // its bottom opens upwards from the point.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node || x === undefined || y === undefined) return
    const right = window.innerWidth - node.offsetWidth - edge
    const fits = y + node.offsetHeight <= window.innerHeight - edge
    node.style.left = `${Math.max(0, Math.min(x, right))}px`
    node.style.top = `${fits ? y : Math.max(0, y - node.offsetHeight)}px`
  }, [x, y])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menu = ref.current
    if (!menu) return
    const items = [...menu.querySelectorAll<HTMLElement>(ITEM)]
    const index = items.findIndex((item) => item === document.activeElement)
    let next: HTMLElement | undefined
    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length]
    else if (event.key === 'ArrowUp') {
      next = items[(index - 1 + items.length) % items.length]
    } else if (event.key === 'Home') next = items[0]
    else if (event.key === 'End') next = items.at(-1)
    else if (event.key === 'Tab' && placement !== 'sheet') {
      // A menu at a point has no place in the order of Tab.
      if (point) event.preventDefault()
      props.onClose()
    }
    if (!next) return
    event.preventDefault()
    next.focus()
  }
  return (
    <div
      aria-label={props.label}
      className={classes(
        styles.menu,
        typeof placement === 'string' ? styles[placement] : local.point,
        props.wide && styles.wide,
      )}
      onKeyDown={onKeyDown}
      ref={ref}
      role="menu"
    >
      {props.entries.map((entry, index) => {
        switch (entry.kind) {
          case 'item':
            return <Item entry={entry} key={entry.key} />
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
    </div>
  )
}
