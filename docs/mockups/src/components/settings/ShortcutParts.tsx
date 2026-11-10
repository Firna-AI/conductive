import type { ReactElement, ReactNode } from 'react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { TabBrowser } from '../../fixtures/shortcutHosts'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { KeyChips, spokenShortcut, type Shortcut } from '../common/KeyChips'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ShortcutsSections.module.css'

/**
 * A shortcut that another command holds, which a recorded shortcut or a
 * Reset would take: the shortcut, the label of that command, and the pages
 * that Cancel and Replace open. A link is missing where the catalogue draws
 * no page for it.
 */
export type HeldShortcut = {
  shortcut: Shortcut
  owner: string
  cancelTo: string
  replaceTo?: string
}

/** The icon of each kind of line under the shortcuts of a row. */
const messageIcons = {
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
} as const

/** One line under the shortcuts of a row, such as a failed save. */
export function RowMessage(props: {
  tone: keyof typeof messageIcons
  children: ReactNode
}) {
  const Icon = messageIcons[props.tone]
  return (
    <p
      className={classes(styles.message, styles[props.tone])}
      role={props.tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon aria-hidden className={styles.messageIcon} size={13} />
      <span>{props.children}</span>
    </p>
  )
}

/**
 * A shortcut that records a new one in its place when pressed. `keptBy`
 * names the browser that keeps the shortcut in a normal tab, where it is
 * dimmed. The person can still change it, because it works elsewhere.
 */
export function KeyButton(props: {
  shortcut: Shortcut
  label: string
  to?: string
  keptBy?: TabBrowser
}) {
  const kept = props.keptBy
    ? `, a key that ${props.keptBy} keeps in this tab`
    : ''
  const name = `Change ${spokenShortcut(props.shortcut)} for ${props.label}${kept}`
  const chips = (
    <KeyChips dimmed={props.keptBy !== undefined} shortcut={props.shortcut} />
  )
  if (props.to) {
    return (
      <ScreenLink aria-label={name} className={styles.key} to={props.to}>
        {chips}
      </ScreenLink>
    )
  }
  return (
    <button aria-label={name} className={styles.key} type="button">
      {chips}
    </button>
  )
}

/**
 * The field that waits for the keys, or shows a shortcut that waits for
 * Replace or Cancel: the keys that it recorded, or a default shortcut that
 * Reset would take from another command.
 */
export function Recorder(props: { shortcut?: Shortcut }) {
  return (
    <span className={styles.recorder}>
      {props.shortcut ? (
        <KeyChips shortcut={props.shortcut} />
      ) : (
        'Press the keys'
      )}
    </span>
  )
}

/** Cancel, which ends the recording or the question, and keeps the keys. */
export function CancelButton(props: { to: string }) {
  return (
    <ScreenLink asChild to={props.to}>
      <ActionButton tone="plain">Cancel</ActionButton>
    </ScreenLink>
  )
}

/**
 * Remove, beside Cancel while the recorder replaces a shortcut. It takes
 * that shortcut off the command and saves at once, so a command can lose
 * every shortcut.
 */
export function RemoveButton(props: { shortcut: Shortcut; label: string }) {
  return (
    <ActionButton
      accessibilityLabel={`Remove ${spokenShortcut(props.shortcut)} from ${props.label}`}
      tone="plain"
    >
      Remove
    </ActionButton>
  )
}

/** A button that opens a page of the catalogue, or a button alone. */
export function Linked(props: { to?: string; children: ReactElement }) {
  if (!props.to) return props.children
  return (
    <ScreenLink asChild to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * Replace and Cancel, at the end of a row whose shortcut another command
 * holds. Replace moves the shortcut to this row in one save, and Cancel
 * keeps the keys of both commands.
 */
export function ConflictActions(props: { held: HeldShortcut; label: string }) {
  const { held } = props
  return (
    <>
      <Linked to={held.replaceTo}>
        <ActionButton
          accessibilityLabel={`Replace: move ${spokenShortcut(held.shortcut)} from ${held.owner} to ${props.label}`}
        >
          Replace
        </ActionButton>
      </Linked>
      <CancelButton to={held.cancelTo} />
    </>
  )
}

/** The line under a row that names the command that holds its shortcut. */
export function ConflictLine(props: { held: HeldShortcut }) {
  return (
    <RowMessage tone="warning">
      {props.held.owner} uses <KeyChips shortcut={props.held.shortcut} />.
    </RowMessage>
  )
}

/**
 * The line of a row: the label, a note or Reset, the shortcuts, and the
 * control at the end, then a message under them.
 */
export function RowLayout(props: {
  label: string
  note?: ReactNode
  keys: ReactNode
  end?: ReactNode
  message?: ReactNode
}) {
  return (
    <>
      <div className={styles.line}>
        <span className={styles.label}>{props.label}</span>
        {props.note}
        <span className={styles.keys}>{props.keys}</span>
        <span className={styles.end}>{props.end}</span>
      </div>
      {props.message}
    </>
  )
}
