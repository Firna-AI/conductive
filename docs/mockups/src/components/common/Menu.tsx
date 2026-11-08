import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { classes } from './classes'
import styles from './Menu.module.css'

export type MenuItem = {
  kind: 'item'
  label: string
  icon?: LucideIcon
  /** A mark in place of the icon, such as an avatar or an agent mark. */
  mark?: ReactNode
  /** Muted text after the label, such as the time of a session. */
  detail?: string
  /** An icon at the end of the row, such as the arrow that reopens. */
  trailingIcon?: LucideIcon
  /** A choice in a group: the menu marks the current one. */
  checked?: boolean
  tone?: 'danger'
  /** The row under the pointer or the keyboard focus. */
  highlighted?: boolean
}

export type MenuEntry =
  | MenuItem
  | { kind: 'label'; label: string }
  /** A short line that explains the choices, under them. */
  | { kind: 'note'; text: string }
  | { kind: 'divider' }

/**
 * Where the menu opens, beside its trigger. A sheet places the rows in a
 * phone sheet instead.
 */
export type MenuPlacement =
  'below-start' | 'below-end' | 'above-start' | 'above-end' | 'sheet'

function Item(props: { entry: MenuItem }) {
  const { entry } = props
  const Icon = entry.icon
  const Trailing = entry.trailingIcon
  const choice = entry.checked !== undefined
  let lead: ReactNode = null
  if (entry.mark) lead = <span className={styles.mark}>{entry.mark}</span>
  else if (Icon) lead = <Icon aria-hidden className={styles.icon} size={14} />
  return (
    <div
      aria-checked={choice ? entry.checked : undefined}
      className={classes(
        styles.item,
        entry.tone === 'danger' && styles.danger,
        entry.highlighted && styles.highlighted,
      )}
      role={choice ? 'menuitemradio' : 'menuitem'}
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
    </div>
  )
}

/**
 * An open menu of actions or choices, drawn in place. Its trigger's wrapper
 * sets the position that the menu opens from. A wide menu fits long rows,
 * such as the titles of sessions.
 */
export function Menu(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: MenuPlacement
  wide?: boolean
}) {
  return (
    <div
      aria-label={props.label}
      className={classes(
        styles.menu,
        styles[props.placement],
        props.wide && styles.wide,
      )}
      role="menu"
    >
      {props.entries.map((entry, index) => {
        switch (entry.kind) {
          case 'item':
            return <Item entry={entry} key={entry.label} />
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
