import { useEffect, useId, useRef } from 'react'
import { thisMacWords } from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import styles from '../../../docs/mockups/src/components/capabilities/Capabilities.module.css'
import check from '../../../docs/mockups/src/components/common/CheckOption.module.css'
import {
  ChangeOutcome,
  type ChangeStatus,
} from '../../../docs/mockups/src/components/mac/ChangeOutcome'

/** The result under the line: a start that failed, or a Stop. */
export interface LineResult {
  status: ChangeStatus
  title: string
  message: string | null
}

/**
 * The line Allow all commands on this Mac, which only the Mac app shows,
 * under the switch of Mac access while it is on (Mac access decision 4 A).
 */
export interface ThisMacLineView {
  checked: boolean
  /** The box takes no change, such as while this Mac shows no settings. */
  disabled: boolean
  /** A start or a Stop of the grant waits for the Mac. */
  busy: boolean
  hint: string
  result: LineResult | null
  /**
   * How many times the switch turned on in the open control. The line
   * that a switch-on shows scrolls into view.
   */
  reveal: number
  change: (on: boolean) => void
}

/**
 * Scrolls the line into view when a switch-on shows it, and when a new
 * result shows under it, because the line sits below the secrets of a long
 * control. The control opens at its top, also when the line shows then.
 */
function useReveal(reveal: number, result: string | null) {
  const line = useRef<HTMLDivElement>(null)
  const shown = useRef(result)
  useEffect(() => {
    if (reveal > 0) line.current?.scrollIntoView?.({ block: 'nearest' })
  }, [reveal])
  useEffect(() => {
    const before = shown.current
    shown.current = result
    if (result !== null && result !== before) {
      line.current?.scrollIntoView?.({ block: 'nearest' })
    }
  }, [result])
  return line
}

/**
 * The line of this Mac: a check starts a grant until Stop of the workspace
 * on this Mac, and an uncheck stops it, as Stop does. Each member sees and
 * changes only the line of their own Mac. A start that failed shows Not
 * started and its cause under the line, and an uncheck shows the result of
 * its Stop. The line stays, so a result offers no Try again.
 */
export function ThisMacCheck(props: { line: ThisMacLineView }) {
  const hint = useId()
  const { line } = props
  const { result } = line
  const ref = useReveal(
    line.reveal,
    result ? `${result.title}\n${result.message ?? ''}` : null,
  )
  return (
    <div className={styles.line} ref={ref}>
      <label className={check.option}>
        <input
          aria-busy={line.busy}
          aria-describedby={hint}
          aria-label={thisMacWords.line}
          checked={line.checked}
          className={check.box}
          disabled={line.disabled}
          onChange={(event) => line.change(event.currentTarget.checked)}
          type="checkbox"
        />
        <span className={check.text}>
          <span className={styles.lineLabel}>{thisMacWords.line}</span>
          <span className={check.hint} id={hint}>
            {line.hint}
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
