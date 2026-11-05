import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { classes } from './classes'
import styles from './Menu.module.css'

export type MenuEntry =
  | {
      kind: 'item'
      label: string
      icon?: LucideIcon
      /** A choice in a group: the menu marks the current one. */
      checked?: boolean
      tone?: 'danger'
      /** The row under the pointer or the keyboard focus. */
      highlighted?: boolean
    }
  | { kind: 'label'; label: string }
  | { kind: 'divider' }

/**
 * Where the menu opens, beside its trigger. A sheet places the rows in a
 * phone sheet instead.
 */
export type MenuPlacement =
  'below-start' | 'below-end' | 'above-start' | 'above-end' | 'sheet'

function Item(props: { entry: Extract<MenuEntry, { kind: 'item' }> }) {
  const { entry } = props
  const Icon = entry.icon
  const choice = entry.checked !== undefined
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
      {Icon ? <Icon aria-hidden className={styles.icon} size={14} /> : null}
      <span className={styles.label}>{entry.label}</span>
      {entry.checked ? (
        <Check aria-hidden className={styles.check} size={14} />
      ) : null}
    </div>
  )
}

/**
 * An open menu of actions or choices, drawn in place. Its trigger's wrapper
 * sets the position that the menu opens from.
 */
export function Menu(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: MenuPlacement
}) {
  return (
    <div
      aria-label={props.label}
      className={classes(styles.menu, styles[props.placement])}
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
          case 'divider':
            return <hr className={styles.divider} key={`divider-${index}`} />
        }
      })}
    </div>
  )
}
