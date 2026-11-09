import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/common/Menu.module.css'
import controls from './controls.module.css'
import { useFocusInside } from './dismiss'

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
  /** A choice in a group: the menu marks the current one. */
  checked?: boolean
}

export type MenuEntry =
  | MenuItem
  | { kind: 'label'; label: string }
  | { kind: 'note'; text: string }
  | { kind: 'divider' }

export type MenuPlacement =
  'below-start' | 'below-end' | 'above-start' | 'above-end' | 'sheet'

const ITEM = '[role="menuitem"], [role="menuitemradio"]'

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
      className={classes(controls.bare, styles.item, controls.row)}
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
 * An open menu of actions or choices, in the dense rows of the mockups. Its
 * trigger's wrapper sets the position that it opens from. The arrow keys
 * move between rows. Escape closes it, and Tab closes a popover. Tab stays
 * inside a sheet. A wide menu fits long rows, such as session titles.
 */
export function Menu(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: MenuPlacement
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusInside(ref, firstItem)
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
    else if (event.key === 'Tab' && props.placement !== 'sheet') props.onClose()
    if (!next) return
    event.preventDefault()
    next.focus()
  }
  return (
    <div
      aria-label={props.label}
      className={classes(
        styles.menu,
        styles[props.placement],
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
