import { useId, type ReactNode } from 'react'
import { Laptop } from 'lucide-react'
import { Switch } from '@firna/ui/switch'
import { failedMessage } from '../../fixtures/mac'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { ChangeOutcome } from '../mac/ChangeOutcome'
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
 * the workspace, and unchecked otherwise, also while the 15 minutes run.
 * After a start that failed, it stays unchecked and shows the cause. In
 * New workspace, checked means that the create starts the grant.
 */
export type ThisMacLine = 'checked' | 'unchecked' | FailedStart

/** Mac access of the workspace, and the line of this Mac while it is on. */
export type MacAccessView = { on: false } | { on: true; thisMac: ThisMacLine }

/** New workspace, or a workspace that exists. */
type Place = keyof typeof thisMacWords.lineHint

/** The cause of each start that failed, which the line and the notice show. */
export const startCauses: Readonly<Record<FailedStart, string>> = {
  'not-started': failedMessage,
  'not-reached': thisMacWords.notAvailable,
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
 * running 15 minutes until Stop. A start that failed shows its result under
 * the line until the next change of the line. The line stays, so the result
 * needs no Try again.
 */
function ThisMacCheck(props: { line: ThisMacLine; place: Place }) {
  const hint = useId()
  const { line } = props
  const failed = line === 'not-started' || line === 'not-reached'
  return (
    <div className={styles.line}>
      <label className={check.option}>
        <input
          aria-describedby={hint}
          checked={line === 'checked'}
          className={check.box}
          onChange={noop}
          type="checkbox"
        />
        <span className={check.text}>
          <span className={styles.lineLabel}>{thisMacWords.line}</span>
          <span className={check.hint} id={hint}>
            {thisMacWords.lineHint[props.place]}
          </span>
        </span>
      </label>
      {failed ? (
        <ChangeOutcome
          message={startCauses[line]}
          status="failed"
          title={thisMacWords.notStarted}
        />
      ) : null}
    </div>
  )
}

/**
 * The note of a browser in place of the line (Mac access decision 5 A).
 * Only the page of the Mac app can start a grant, so the note names its
 * line. Without it, the Mac asks at the first command.
 */
function BrowserNote() {
  return (
    <p className={styles.note}>
      <Laptop aria-hidden className={styles.noteIcon} size={14} />
      <span>{thisMacWords.browserNote}</span>
    </p>
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
