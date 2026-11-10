import type { ReactNode } from 'react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { TabBrowser } from '../../fixtures/shortcutHosts'
import { classes } from '../common/classes'
import { KeyChips, spokenShortcut, type Shortcut } from '../common/KeyChips'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ShortcutsSections.module.css'

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

/** The field that waits for the keys, or shows the keys that it recorded. */
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
