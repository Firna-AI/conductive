import { useId, type ReactNode } from 'react'
import { Switch } from '@firna/ui/switch'
import { allowAllLeft, failedMessage, stoppedResult } from '../../fixtures/mac'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { ChangeOutcome, type ChangeStatus } from '../mac/ChangeOutcome'
import { BrowserNote } from './BrowserNote'
import { macAccessWords, thisMacWords } from './capabilitiesCopy'
import type { CapabilityPart } from './CapabilitiesPanel'
import check from '../common/CheckOption.module.css'
import styles from './Capabilities.module.css'

/** Where the control shows: in the Mac app, or in a browser. */
export type Shell = 'mac-app' | 'browser'

/**
 * A start of the grant until Stop that failed: the Mac did not start it,
 * or the start found this Mac not available (Mac access decision 3 A).
 */
export type FailedStart = 'not-started' | 'not-reached'

/**
 * The line of this Mac: checked while this Mac has a grant until Stop for
 * the workspace, and unchecked otherwise. `fifteen-minutes` is the line
 * while the 15 minutes of the workspace run, and `stopped` is the line
 * after an uncheck, which is a Stop. After a start that failed, the line
 * stays unchecked and shows the cause. `not-available` is the line while
 * the page cannot read the settings of this Mac, such as during a
 * reconnect, and `not-reached` is the same line after a start that found
 * this Mac not available. In New workspace, checked means that the create
 * starts the grant.
 */
export type ThisMacLine =
  | 'checked'
  | 'unchecked'
  | 'fifteen-minutes'
  | 'stopped'
  | 'not-available'
  | FailedStart

/** Mac access of the workspace, and the line of this Mac while it is on. */
export type MacAccessView = { on: false } | { on: true; thisMac: ThisMacLine }

/** New workspace, or a workspace that exists. */
type Place = keyof typeof thisMacWords.lineHint

/** The result under the line: a start that failed, or a Stop. */
type LineResult = { status: ChangeStatus; title: string; message: string }

/** The cause of each start that failed, which the line and the notice show. */
export const startCauses: Readonly<Record<FailedStart, string>> = {
  'not-started': failedMessage,
  'not-reached': thisMacWords.notAvailable,
}

/**
 * The result under the line in each state that shows one: Not started with
 * the cause of a start that failed, or the Stop of an uncheck that the Mac
 * made and saved.
 */
const lineResults: Partial<Record<ThisMacLine, LineResult>> = {
  stopped: { status: 'done', ...stoppedResult },
  'not-started': {
    status: 'failed',
    title: thisMacWords.notStarted,
    message: startCauses['not-started'],
  },
  'not-reached': {
    status: 'failed',
    title: thisMacWords.notStarted,
    message: startCauses['not-reached'],
  },
}

/**
 * Whether the page cannot read the settings of this Mac. The box is then
 * off and unchecked, so the line never claims a grant that may not exist.
 */
function unread(line: ThisMacLine): boolean {
  return line === 'not-available' || line === 'not-reached'
}

/**
 * The hint of the line: the time left of the bar while the 15 minutes run,
 * and that this Mac is not available while the page cannot read its
 * settings, unless a result under the line already says why. Otherwise,
 * what the line allows.
 */
function hintOf(line: ThisMacLine, place: Place): string {
  if (line === 'fifteen-minutes') {
    return thisMacWords.fifteenMinutesHint(allowAllLeft)
  }
  if (unread(line) && lineResults[line] === undefined) {
    return thisMacWords.notAvailableHint
  }
  return thisMacWords.lineHint[place]
}

/** The switch of Mac access, which saves at once. */
function MacAccessSwitch(props: { on: boolean }) {
  const { field } = useControlSizes()
  return (
    <Switch
      accessibilityLabel={macAccessWords.title}
      onValueChange={noop}
      size={field === 'lg' ? 'md' : 'sm'}
      value={props.on}
    />
  )
}

/**
 * The line of this Mac, which only the Mac app shows, while Mac access is
 * on (Mac access decisions 1 C and 4 A). Each member sees the state of
 * their own Mac. A check starts the grant until Stop on this Mac, and keeps
 * running 15 minutes until Stop. An uncheck stops the grant, as Stop does.
 * The result of the last start or Stop shows under the line until the next
 * change of the line. The line stays, so the result needs no Try again.
 */
function ThisMacCheck(props: { line: ThisMacLine; place: Place }) {
  const hint = useId()
  const { line } = props
  const result = lineResults[line]
  return (
    <div className={styles.line}>
      <label className={check.option}>
        <input
          aria-describedby={hint}
          checked={line === 'checked'}
          className={check.box}
          disabled={unread(line)}
          onChange={noop}
          type="checkbox"
        />
        <span className={check.text}>
          <span className={styles.lineLabel}>{thisMacWords.line}</span>
          <span className={check.hint} id={hint}>
            {hintOf(line, props.place)}
          </span>
        </span>
      </label>
      {result ? (
        <ChangeOutcome
          message={result.message}
          status={result.status}
          title={result.title}
        />
      ) : null}
    </div>
  )
}

/**
 * The Mac access part: the shared switch, and while it is on, the line of
 * this Mac in the Mac app or the note of a browser. While the switch is
 * off, the hint of the Mac app adds that turning it on also allows all
 * commands on this Mac (Mac access decision 1 C).
 */
export function macAccessPart(
  macAccess: MacAccessView,
  place: Place,
  shell: Shell,
): CapabilityPart {
  const macApp = shell === 'mac-app'
  let content: ReactNode = null
  if (macAccess.on) {
    content = macApp ? (
      <ThisMacCheck line={macAccess.thisMac} place={place} />
    ) : (
      <BrowserNote />
    )
  }
  return {
    key: 'mac-access',
    title: macAccessWords.title,
    hint: macApp && !macAccess.on ? thisMacWords.offHint : macAccessWords.hint,
    control: <MacAccessSwitch on={macAccess.on} />,
    content,
  }
}
