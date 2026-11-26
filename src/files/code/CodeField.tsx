import {
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { useFocusRing } from '@firna/ui/focusRing'
import { codeKeyEdit, type CodeEdit, type CodeKey } from './code-keys'
import { digitStyle, TokenSpans } from './CodeView'
import { highlightLines } from './highlight'
import { languageOf } from './languages'
import a11y from '../ui/a11y.module.css'
import styles from './CodeField.module.css'

/**
 * The coloured lines of `value`, with their numbers. `name` is a file name
 * that picks the language of the colours, as a file tab does. A line ends
 * with its line break, so the text of the block is the text of `value`.
 */
function Lines(props: { value: string; name: string; hidden?: boolean }) {
  const lines = useMemo(
    () => highlightLines(props.value.split('\n'), languageOf(props.name)),
    [props.value, props.name],
  )
  const last = lines.length - 1
  return (
    <pre aria-hidden={props.hidden} className={styles.lines}>
      {lines.map((tokens, index) => (
        <span className={styles.line} key={index}>
          <span className={styles.text}>
            <TokenSpans tokens={tokens} />
            {index < last ? '\n' : null}
          </span>
        </span>
      ))}
    </pre>
  )
}

/** The width of the line numbers, for the lines of `value`. */
function gutterStyle(value: string): CSSProperties {
  return digitStyle(value.split('\n').length)
}

/**
 * Code to read, such as a script that only an admin changes, with line
 * numbers and syntax colours. `label` names the block for a screen reader.
 */
export function CodeBlock(props: {
  label: string
  name: string
  value: string
}) {
  return (
    <div
      aria-label={props.label}
      className={`${styles.field} ${styles.readOnly}`}
      role="group"
      style={gutterStyle(props.value)}
    >
      <Lines name={props.name} value={props.value} />
    </div>
  )
}

/** The keys of a code field, which a screen reader reads with the field. */
const codeFieldKeys =
  'Tab indents and Shift+Tab outdents. To leave the field, press Escape, then Tab.'

/** The key that a code field handles itself, or null for the browser. */
function codeKeyOf(event: KeyboardEvent): CodeKey | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null
  if (event.nativeEvent.isComposing) return null
  if (event.key === 'Tab') return event.shiftKey ? 'outdent' : 'indent'
  if (event.key === 'Enter' && !event.shiftKey) return 'newline'
  return null
}

/**
 * Makes `edit` in the text area as typed text, so that Undo takes it back.
 * A browser without that command gets the text through the setter of the
 * element, which React does not watch, and the same input event, so the
 * change reaches `onChange`.
 */
function applyEdit(area: HTMLTextAreaElement, edit: CodeEdit) {
  area.setSelectionRange(edit.from, edit.to)
  const command = edit.text ? 'insertText' : 'delete'
  // execCommand is the one way to change the text that keeps Undo working.
  const typed =
    typeof document.execCommand === 'function' &&
    document.execCommand(command, false, edit.text)
  if (!typed) {
    const { value } = area
    const text = value.slice(0, edit.from) + edit.text + value.slice(edit.to)
    const prototype = HTMLTextAreaElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(area, text)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  }
  area.setSelectionRange(...edit.selection)
}

/**
 * A code field, with line numbers and syntax colours, as in a file tab.
 * `name` is a file name that picks the language, such as `install.sh`.
 * The field grows with its lines, and shows at least three. Long lines
 * wrap. Tab and Shift+Tab indent and outdent, and Enter keeps the indent
 * of the line. Escape, then Tab, moves the focus out of the field. The
 * field's description says so for a screen reader.
 */
export function CodeField(props: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
}) {
  const focus = useFocusRing({ target: 'descendant' })
  const keysHint = useId()
  const leaving = useRef(false)
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const key = codeKeyOf(event)
    const leave = leaving.current
    leaving.current = event.key === 'Escape'
    if (!key || (leave && key !== 'newline')) return
    const area = event.currentTarget
    const { selectionStart, selectionEnd, value } = area
    const edit = codeKeyEdit(key, value, selectionStart, selectionEnd)
    event.preventDefault()
    if (edit) applyEdit(area, edit)
  }
  const active = focus.focused ? ` ${styles.active}` : ''
  return (
    <div
      {...focus.focusRingDomProps}
      className={`${styles.field}${active}`}
      style={{ ...gutterStyle(props.value), ...focus.focusRingVariables }}
    >
      <Lines hidden name={props.name} value={props.value} />
      <textarea
        {...focus.focusTargetDomProps}
        aria-describedby={keysHint}
        aria-label={props.label}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        className={styles.input}
        onBlur={focus.onBlur}
        onChange={(event) => props.onChange(event.target.value)}
        onFocus={(event) => {
          leaving.current = false
          focus.onFocus(event)
        }}
        onKeyDown={onKeyDown}
        spellCheck={false}
        value={props.value}
      />
      <span className={a11y.hidden} id={keysHint}>
        {codeFieldKeys}
      </span>
    </div>
  )
}
