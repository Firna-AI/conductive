import { ChevronRight } from 'lucide-react'
import type { PersonKey } from '../../fixtures/members'
import type { Run, RunState } from '../../fixtures/routineRuns'
import type { Routine } from '../../fixtures/routines'
import { orgs } from '../../fixtures/orgs'
import { repositories } from '../../fixtures/repositories'
import { classes } from '../common/classes'
import { ExternalLink } from '../common/ExternalLink'
import { ScreenLink } from '../common/ScreenLink'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import {
  failureCopy,
  runStateLabels,
  runTriggerLabel,
  skipCopy,
} from './runCopy'
import styles from './RunList.module.css'

/** The run that a row draws, and what the list knows about it. */
type RowProps = {
  run: Run
  routine: Routine
  /**
   * The person signed in. The owner of a failed run reads what to fix. None
   * where nobody can act, as in a suspended org.
   */
  viewer?: PersonKey
  /** The screen of the run's workspace, when the mockups draw it. */
  to?: string
}

/** The address of a pull request of the routine's repository on GitHub. */
function pullRequestUrl(routine: Routine, number: number): string {
  return `https://github.com/${repositories[routine.repository].name}/pull/${number}`
}

/**
 * The mark of a run: the mark of its state. A failed run keeps the mark of
 * its failure, also after Try again, because the run keeps its failed
 * outcome. A failed first start shows the cross of its workspace in the
 * error state. A failed check and a failed first turn show the slash.
 * After a failed turn, the mark of the workspace shows a finished turn,
 * which would hide the failure.
 */
function markOf(run: Run): RunState {
  return run.state === 'failed' && run.cause === 'start' ? 'error' : run.state
}

/** The cause of a failed run, or the reason why a rule skipped a run. */
function Reason(props: RowProps) {
  const { run } = props
  if (run.state === 'skipped') {
    return (
      <span className={styles.reason}>
        {skipCopy(run.skip, run.trigger, orgs.acme.name)}
      </span>
    )
  }
  if (run.state !== 'failed') return null
  const copy = failureCopy(run, props.viewer)
  return (
    <span className={styles.reason}>
      {copy.text}
      {copy.action ? (
        <>
          {' '}
          <ScreenLink className={styles.action} to={copy.action.to}>
            {copy.action.label}
          </ScreenLink>
        </>
      ) : null}
    </span>
  )
}

/**
 * One run: its state, its trigger, its time, and, for a pull request, a
 * link to the pull request on GitHub. A run with a workspace opens it from
 * the whole row.
 */
function RunRow(props: RowProps) {
  const { run, to } = props
  const trigger = runTriggerLabel(run.trigger)
  const number =
    run.trigger.kind === 'pull-request' ? run.trigger.number : undefined
  const title = number === undefined ? trigger : `${trigger} #${number}`
  const failed = run.state === 'failed' || run.state === 'error'
  return (
    <li className={classes(styles.row, to !== undefined && styles.linked)}>
      <span className={styles.glyph}>
        <StatusGlyph status={markOf(run)} />
      </span>
      <span className={styles.text}>
        <span className={styles.top}>
          {to ? (
            <ScreenLink
              aria-label={`Open the workspace of ${title}`}
              className={styles.open}
              to={to}
            >
              {trigger}
            </ScreenLink>
          ) : (
            <span className={styles.trigger}>{trigger}</span>
          )}
          {number === undefined ? null : (
            <span className={styles.pr}>
              <ExternalLink href={pullRequestUrl(props.routine, number)}>
                {`#${number}`}
              </ExternalLink>
            </span>
          )}
          <span className={styles.when}>{run.when}</span>
        </span>
        <span className={classes(styles.state, failed && styles.failed)}>
          {runStateLabels[run.state]}
        </span>
        <Reason {...props} />
      </span>
      {to ? (
        <ChevronRight aria-hidden className={styles.chevron} size={14} />
      ) : null}
    </li>
  )
}

/**
 * The runs of a routine, newest first. Each run opens its own workspace
 * (decision 501), also a run whose first start or first turn failed.
 * `links` gives the screens of the workspaces that the mockups draw. A
 * boxed list has a full outline, for the page of a phone.
 */
export function RunList(props: {
  runs: readonly Run[]
  routine: Routine
  viewer?: PersonKey
  links: Readonly<Record<string, string>>
  boxed?: boolean
}) {
  return (
    <ul
      aria-label="Runs"
      className={classes(styles.list, props.boxed && styles.boxed)}
    >
      {props.runs.map((run) => (
        <RunRow
          key={run.key}
          routine={props.routine}
          run={run}
          to={props.links[run.key]}
          viewer={props.viewer}
        />
      ))}
    </ul>
  )
}
