import { ChevronRight } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/routines/RunList.module.css'
import { StatusGlyph } from '../../../docs/mockups/src/components/workspaces/StatusGlyph'
import { routes } from '../../app/router'
import { formatAgo } from '../../app/time'
import type { Routine, RoutineRun } from '../../shared/routines'
import { AppLink } from '../ui/AppLink'
import { ExternalLink } from '../ui/links'
import { runStateLabel } from './routine-copy'
import { failureCopy, runTriggerLabel, skipCopy } from './run-copy'

interface RowProps {
  run: RoutineRun
  routine: Routine
  /** The person signed in owns the routine, so a failure says what to fix. */
  ownerViews: boolean
  orgName: string
  now: number
}

/** Why a run has no workspace or failed: its cause, or its skip reason. */
function Reason(props: RowProps) {
  const { run } = props
  if (run.state === 'skipped') {
    return <span className={styles.reason}>{skipCopy(run, props.orgName)}</span>
  }
  if (run.state !== 'failed') return null
  const copy = failureCopy(run, props.routine, props.ownerViews)
  const { action } = copy
  return (
    <span className={styles.reason}>
      {copy.text}
      {action ? (
        <>
          {' '}
          {action.leavesApp ? (
            <a className={styles.action} href={action.to}>
              {action.label}
            </a>
          ) : (
            <AppLink className={styles.action} to={action.to}>
              {action.label}
            </AppLink>
          )}
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
  const { run } = props
  const trigger = runTriggerLabel(run.trigger)
  const pullRequest = run.trigger.kind === 'pull-request' ? run.trigger : null
  const title = pullRequest ? `${trigger} #${pullRequest.number}` : trigger
  const failed = run.state === 'failed' || run.state === 'error'
  const to = run.workspaceId
    ? routes.workspace(props.routine.orgId, run.workspaceId)
    : undefined
  return (
    <li className={classes(styles.row, to !== undefined && styles.linked)}>
      <span className={styles.glyph}>
        <StatusGlyph status={run.state} />
      </span>
      <span className={styles.text}>
        <span className={styles.top}>
          {to ? (
            <AppLink
              aria-label={`Open the workspace of ${title}`}
              className={styles.open}
              to={to}
            >
              {trigger}
            </AppLink>
          ) : (
            <span className={styles.trigger}>{trigger}</span>
          )}
          {pullRequest ? (
            <span className={styles.pr}>
              <ExternalLink href={pullRequest.url}>
                {`#${pullRequest.number}`}
              </ExternalLink>
            </span>
          ) : null}
          <span className={styles.when}>
            {formatAgo(props.now, run.createdAt)}
          </span>
        </span>
        <span className={classes(styles.state, failed && styles.failed)}>
          {runStateLabel(run.state)}
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
 * The runs of a routine, newest first. Each run opens its own workspace. A
 * boxed list has a full outline, for the Runs tab of a phone.
 */
export function RunList(props: {
  runs: readonly RoutineRun[]
  routine: Routine
  ownerViews: boolean
  orgName: string
  now: number
  boxed: boolean
}) {
  return (
    <ul
      aria-label="Runs"
      className={classes(styles.list, props.boxed && styles.boxed)}
    >
      {props.runs.map((run) => (
        <RunRow
          key={run.id}
          now={props.now}
          orgName={props.orgName}
          ownerViews={props.ownerViews}
          routine={props.routine}
          run={run}
        />
      ))}
    </ul>
  )
}
