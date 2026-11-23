import type { ReactNode } from 'react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { TabBrowser } from '../../fixtures/shortcutHosts'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import {
  spokenShortcut,
  type Shortcut,
} from '../../../../../src/ui/components/common/KeyChips'
import { keyChips } from '../../entries/components/common/KeyChips.mockup'
import { Linked, ScreenLink } from '../common/ScreenLink'
import { instanceKey, shortcutKey } from '../../instanceKey'
import styles from '../../../../../src/ui/components/settings/ShortcutsSections.module.css'

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

/**
 * A fixed shortcut that the recorder did not take, with the label of the
 * one fixed row that holds it. A shortcut that several rows hold, or that
 * no row lists, has no label.
 */
export type RefusedShortcut = { shortcut: Shortcut; label?: string }

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
    <keyChips.Component
      dimmed={props.keptBy !== undefined}
      moklyInstance={`${instanceKey(props.label)}-${shortcutKey(props.shortcut)}`}
      shortcut={props.shortcut}
    />
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
        <keyChips.Component
          moklyInstance="recorded"
          shortcut={props.shortcut}
        />
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
      <actionButton.Component moklyInstance="cancel-recording" tone="plain">
        Cancel
      </actionButton.Component>
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
    <actionButton.Component
      accessibilityLabel={`Remove ${spokenShortcut(props.shortcut)} from ${props.label}`}
      moklyInstance="remove-shortcut"
      tone="plain"
    >
      Remove
    </actionButton.Component>
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
        <actionButton.Component
          accessibilityLabel={`Replace: move ${spokenShortcut(held.shortcut)} from ${held.owner} to ${props.label}`}
          moklyInstance="replace-shortcut"
        >
          Replace
        </actionButton.Component>
      </Linked>
      <CancelButton to={held.cancelTo} />
    </>
  )
}

/** The line under a row that names the command that holds its shortcut. */
export function ConflictLine(props: { held: HeldShortcut }) {
  return (
    <RowMessage tone="warning">
      {props.held.owner} uses{' '}
      <keyChips.Component moklyInstance="held" shortcut={props.held.shortcut} />
      .
    </RowMessage>
  )
}

/**
 * The line under a row whose recorder did not take a fixed shortcut. It
 * names the fixed row of the shortcut, as in "Undo always uses ⌘Z.", or
 * says only that the shortcut is fixed, as in "Enter is a fixed shortcut."
 */
export function RefusedLine(props: { refused: RefusedShortcut }) {
  const { label, shortcut } = props.refused
  const keys = (
    <keyChips.Component moklyInstance="refused" shortcut={shortcut} />
  )
  return (
    <RowMessage tone="info">
      {label === undefined ? (
        <>{keys} is a fixed shortcut.</>
      ) : (
        <>
          {label} always uses {keys}.
        </>
      )}
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
