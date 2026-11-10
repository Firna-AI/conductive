import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import { classes } from '../../../../docs/mockups/src/components/common/classes'
import {
  KeyChips,
  spokenShortcut,
} from '../../../../docs/mockups/src/components/common/KeyChips'
import styles from '../../../../docs/mockups/src/components/settings/ShortcutsSections.module.css'
import { formatShortcut, type ShortcutPress } from '../../../app/shortcuts/keys'
import type {
  ShortcutKeyboard,
  ShortcutKeyText,
} from '../../../shared/shortcut-key'
import { useShortcutRecorder } from '../../shortcuts/shortcut-context'

/** The icon of each kind of line under the keys of a row. */
const messageIcons = {
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
} as const

/**
 * One line under the keys of a row, such as a refused fixed key, the
 * command that holds a key, or a failed save.
 */
export function RowMessage(props: {
  tone: keyof typeof messageIcons
  id?: string
  children: ReactNode
}) {
  const Icon = messageIcons[props.tone]
  return (
    <p
      className={classes(styles.message, styles[props.tone])}
      id={props.id}
      role={props.tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon aria-hidden className={styles.messageIcon} size={13} />
      <span>{props.children}</span>
    </p>
  )
}

/** The words that a screen reader says for a key, such as Option Command /. */
export function spokenKey(
  key: ShortcutKeyText,
  keyboard: ShortcutKeyboard,
): string {
  return spokenShortcut(formatShortcut(key, keyboard))
}

/** A key as its keyboard prints it, in the key chips of the mockups. */
export function Keys(props: {
  shortcut: ShortcutKeyText
  keyboard: ShortcutKeyboard
  dimmed?: boolean
}) {
  return (
    <KeyChips
      dimmed={props.dimmed}
      shortcut={formatShortcut(props.shortcut, props.keyboard)}
    />
  )
}

/**
 * A key of a command, which records a new key in its place when pressed.
 * `keptBy` names the browser where the key does not work in this tab, so
 * the key is dimmed. The person can still change it, because it works in
 * the other hosts.
 */
export function KeyButton({
  ref,
  ...props
}: {
  shortcut: ShortcutKeyText
  keyboard: ShortcutKeyboard
  label: string
  keptBy?: string
  disabled: boolean
  onPress: () => void
  /** The button, for the row that moves the focus to it after an edit. */
  ref: Ref<HTMLButtonElement>
}) {
  const text = formatShortcut(props.shortcut, props.keyboard)
  const kept = props.keptBy
    ? `, a key that ${props.keptBy} keeps in this tab`
    : ''
  return (
    <button
      aria-label={`Change ${spokenKey(props.shortcut, props.keyboard)} for ${props.label}${kept}`}
      className={styles.key}
      disabled={props.disabled}
      onClick={props.onPress}
      ref={ref}
      type="button"
    >
      <KeyChips dimmed={props.keptBy !== undefined} shortcut={text} />
    </button>
  )
}

/** A press of the keyboard as the shortcut model reads it. */
function pressOf(event: KeyboardEvent): ShortcutPress {
  return {
    key: event.key,
    code: event.code,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    repeat: event.repeat,
    isComposing: event.nativeEvent.isComposing,
  }
}

/**
 * The field that waits for the keys, with the focus. It takes each key
 * that reaches it, and no key runs a command while it shows. Escape
 * cancels. Tab and Shift+Tab move the focus, such as to Remove and Cancel.
 * `recorded` is a recorded key that waits for its save, or for Replace.
 */
export function Recorder(props: {
  label: string
  keyboard: ShortcutKeyboard
  recorded?: ShortcutKeyText
  /** The line under the row that says why the field still waits. */
  describedBy?: string
  take: (press: ShortcutPress) => void
  cancel: () => void
}) {
  const mark = useShortcutRecorder()
  const field = useRef<HTMLSpanElement | null>(null)
  const ref = useCallback(
    (element: HTMLSpanElement | null) => {
      field.current = element
      return mark(element)
    },
    [mark],
  )
  useEffect(() => field.current?.focus(), [])
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.nativeEvent.isComposing) return
    const moves = !event.metaKey && !event.ctrlKey && !event.altKey
    if (event.key === 'Tab' && moves) return
    event.preventDefault()
    event.stopPropagation()
    if (event.key === 'Escape') props.cancel()
    else if (!event.repeat) props.take(pressOf(event))
  }
  return (
    <span
      aria-describedby={props.describedBy}
      aria-label={`New shortcut for ${props.label}`}
      className={styles.recorder}
      onKeyDown={onKeyDown}
      ref={ref}
      role="textbox"
      tabIndex={0}
    >
      {props.recorded ? (
        <Keys keyboard={props.keyboard} shortcut={props.recorded} />
      ) : (
        'Press the keys'
      )}
    </span>
  )
}

/**
 * A default key that Reset would take from another command. It waits for
 * Replace or Cancel in the field of the recorder, as a recorded key does.
 */
export function HeldKey(props: {
  shortcut: ShortcutKeyText
  keyboard: ShortcutKeyboard
}) {
  return (
    <span className={styles.recorder}>
      <Keys keyboard={props.keyboard} shortcut={props.shortcut} />
    </span>
  )
}

/**
 * The line of a row: the label, a note or Reset, the keys, and the controls
 * at the end, then a message under them.
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
