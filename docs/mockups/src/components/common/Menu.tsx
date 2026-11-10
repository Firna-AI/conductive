import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import a11y from './a11y.module.css'
import { classes } from './classes'
import { ScreenLink } from './ScreenLink'
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
  /** A choice in a group: the menu marks the current one. */
  checked?: boolean
  tone?: 'danger'
  /** The row under the pointer or the keyboard focus. */
  highlighted?: boolean
  /** An item that is off: it keeps its place, greyed, and does nothing. */
  disabled?: boolean
  /**
   * The screen that choosing the item shows, when the mockups draw one.
   * The row is then a link to it.
   */
  to?: string
}

/**
 * A choice that the menu shows but cannot take, such as a pull request
 * whose branch is in another repository: greyed, with its reason under it,
 * and one action beside it, such as a link to a page outside the app.
 */
type UnavailableItem = {
  kind: 'unavailable'
  label: string
  icon?: LucideIcon
  reason: string
  action?: ReactNode
}

export type MenuEntry =
  | MenuItem
  | UnavailableItem
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
  const className = classes(
    styles.item,
    entry.tone === 'danger' && styles.danger,
    entry.highlighted && styles.highlighted,
    entry.disabled && styles.disabled,
  )
  const content = (
    <>
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
    </>
  )
  if (entry.to !== undefined && !entry.disabled) {
    // Mokly allows no menu role on a link, so hidden words name the choice.
    return (
      <ScreenLink className={classes(className, styles.link)} to={entry.to}>
        {content}
        {entry.checked ? <span className={a11y.hidden}>, selected</span> : null}
      </ScreenLink>
    )
  }
  return (
    <div
      aria-checked={choice ? entry.checked : undefined}
      aria-disabled={entry.disabled ? true : undefined}
      className={className}
      role={choice ? 'menuitemradio' : 'menuitem'}
    >
      {content}
    </div>
  )
}

/**
 * A choice that is off, with its reason. The choice is an item that is
 * off, and its action stands beside it, outside the item, so that one
 * press has one target.
 */
function Unavailable(props: { entry: UnavailableItem }) {
  const { entry } = props
  const Icon = entry.icon
  return (
    <div className={styles.unavailable} role="none">
      <div aria-disabled className={styles.unavailableItem} role="menuitem">
        {Icon ? <Icon aria-hidden className={styles.icon} size={14} /> : null}
        <span className={styles.unavailableText}>
          <span className={styles.unavailableLabel}>{entry.label}</span>
          <span className={styles.reason}>{entry.reason}</span>
        </span>
      </div>
      {entry.action ? (
        <span className={styles.unavailableAction}>{entry.action}</span>
      ) : null}
    </div>
  )
}

function Entry(props: { entry: MenuEntry; index: number }) {
  const { entry } = props
  switch (entry.kind) {
    case 'item':
      return <Item entry={entry} />
    case 'unavailable':
      return <Unavailable entry={entry} />
    case 'label':
      return (
        <div className={styles.group} role="none">
          {entry.label}
        </div>
      )
    case 'note':
      return (
        <p className={styles.note} role="none">
          {entry.text}
        </p>
      )
    case 'divider':
      return <hr className={styles.divider} />
  }
}

/** A stable key for each entry: its label or text, or its place. */
function entryKey(entry: MenuEntry, index: number): string {
  switch (entry.kind) {
    case 'item':
    case 'unavailable':
    case 'label':
      return entry.label
    case 'note':
      return `note-${index}`
    case 'divider':
      return `divider-${index}`
  }
}

/**
 * An open menu of actions or choices, drawn in place. Its trigger's wrapper
 * sets the position that the menu opens from. A wide menu fits long rows,
 * such as the titles of sessions. A picker can add a search field above
 * the rows, and a status part under them, such as a list that loads.
 */
export function Menu(props: {
  label: string
  entries: readonly MenuEntry[]
  placement: MenuPlacement
  wide?: boolean
  /** A field above the rows, such as the search of a picker. */
  search?: ReactNode
  /** A part under the rows, such as a list that loads or did not load. */
  status?: ReactNode
}) {
  const box = classes(
    styles.menu,
    styles[props.placement],
    props.wide && styles.wide,
  )
  const rows = props.entries.map((entry, index) => (
    <Entry entry={entry} index={index} key={entryKey(entry, index)} />
  ))
  if (props.search === undefined && props.status === undefined) {
    return (
      <div aria-label={props.label} className={box} role="menu">
        {rows}
      </div>
    )
  }
  return (
    <div className={box}>
      {props.search ? (
        <div className={styles.search}>{props.search}</div>
      ) : null}
      <div aria-label={props.label} className={styles.rows} role="menu">
        {rows}
      </div>
      {props.status ? (
        <div className={styles.status}>{props.status}</div>
      ) : null}
    </div>
  )
}
