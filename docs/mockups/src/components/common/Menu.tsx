import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, ChevronRight } from 'lucide-react'
import a11y from './a11y.module.css'
import { classes } from './classes'
import { KeyChips, type Shortcut } from './KeyChips'
import { SwitchPicture } from './SwitchPicture'
import styles from './Menu.module.css'

type MenuItem = {
  kind: 'item'
  label: string
  icon?: LucideIcon
  /** A mark in place of the icon, such as an avatar or an agent mark. */
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
  tone?: 'danger'
  /** The row under the pointer or the keyboard focus. */
  highlighted?: boolean
  /** An item that is off: it keeps its place, greyed, and does nothing. */
  disabled?: boolean
  /**
   * The item opens a submenu of choices, which an arrow at its end shows.
   * An open submenu keeps its item highlighted.
   */
  submenu?: 'closed' | 'open'
}

export type MenuEntry =
  | MenuItem
  | { kind: 'label'; label: string }
  /** A short line that explains the choices, under them. */
  | { kind: 'note'; text: string }
  /**
   * A setting that is on or off, with a switch at the end of its row.
   * `shortcut` is the key of the command that changes the setting, which
   * stands before the switch where the key runs, as a palette row ends with
   * the key of its command.
   */
  | { kind: 'switch'; label: string; on: boolean; shortcut?: Shortcut }
  | { kind: 'divider' }

/**
 * Where the menu opens, beside its trigger. A sheet places the rows in a
 * phone sheet instead.
 */
export type MenuPlacement =
  'below-start' | 'below-end' | 'above-start' | 'above-end' | 'sheet'

/**
 * A menu at a point, such as at the pointer of a right click. A view runs
 * no script, so the screen places the box, and an open submenu beside it.
 */
type PointPlacement = 'point'

function Item(props: { entry: MenuItem }) {
  const { entry } = props
  const Icon = entry.icon
  const Trailing = entry.submenu ? ChevronRight : entry.trailingIcon
  const choice = entry.checked !== undefined
  let lead: ReactNode = null
  if (entry.mark) lead = <span className={styles.mark}>{entry.mark}</span>
  else if (Icon) lead = <Icon aria-hidden className={styles.icon} size={14} />
  return (
    <div
      aria-checked={choice ? entry.checked : undefined}
      aria-disabled={entry.disabled ? true : undefined}
      aria-expanded={entry.submenu ? entry.submenu === 'open' : undefined}
      aria-haspopup={entry.submenu ? 'menu' : undefined}
      className={classes(
        styles.item,
        entry.tone === 'danger' && styles.danger,
        (entry.highlighted || entry.submenu === 'open') && styles.highlighted,
        entry.disabled && styles.disabled,
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
      {entry.trailingLabel ? (
        <span className={a11y.hidden}>{entry.trailingLabel}</span>
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
  placement: MenuPlacement | PointPlacement
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
          case 'switch':
            return (
              <div
                aria-checked={entry.on}
                className={styles.item}
                key={entry.label}
                role="menuitemcheckbox"
              >
                <span className={styles.label}>{entry.label}</span>
                {entry.shortcut ? (
                  <span className={styles.keys}>
                    <KeyChips shortcut={entry.shortcut} />
                  </span>
                ) : null}
                <SwitchPicture on={entry.on} />
              </div>
            )
          case 'divider':
            return <hr className={styles.divider} key={`divider-${index}`} />
        }
      })}
    </div>
  )
}
