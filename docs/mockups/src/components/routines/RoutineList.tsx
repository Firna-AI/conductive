import type { Viewport } from '@mokly/mokly'
import type { RoutineRow } from '../../fixtures/routineRows'
import { repositories } from '../../fixtures/repositories'
import { offAfterFailedRuns } from '../../fixtures/routines'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText, type StatusTone } from '../common/StatusText'
import { PersonAvatar } from '../orgs/OrgTile'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { runStateLabels } from './runCopy'
import { triggersSummary } from './triggerCopy'
import styles from './RoutineList.module.css'

/** The state of the last run and its time, or no run yet. */
function LastRun(props: { row: RoutineRow }) {
  const run = props.row.lastRun
  if (!run) return <span className={styles.lastRun}>No runs</span>
  return (
    <span
      className={styles.lastRun}
      title={`Last run: ${runStateLabels[run.state]}, ${run.when}`}
    >
      <StatusGlyph status={run.state} />
      <span className={styles.when}>{run.when}</span>
    </span>
  )
}

function Owner(props: { row: RoutineRow }) {
  const { owner } = props.row.routine
  return (
    <span className={styles.owner} title={`By ${owner.name}`}>
      <PersonAvatar initials={owner.initials} size={18} />
      <span className={styles.ownerName}>{owner.name}</span>
    </span>
  )
}

/**
 * Whether the routine is on. A routine that turned off after failed runs
 * says so in short, under Off (decision 213 B).
 */
function State(props: { row: RoutineRow }) {
  const { routine } = props.row
  const failed = offAfterFailedRuns(routine)
  let tone: StatusTone = routine.active ? 'success' : 'muted'
  if (failed) tone = 'danger'
  return (
    <span className={styles.state}>
      <StatusText label={routine.active ? 'Active' : 'Off'} tone={tone} />
      {failed ? <span className={styles.reason}>3 failed runs</span> : null}
    </span>
  )
}

function Row(props: { row: RoutineRow; to?: string; viewport: Viewport }) {
  const { row, to } = props
  const { routine } = row
  const detail = `${repositories[routine.repository].name} · ${triggersSummary(routine.triggers)}`
  const mobile = props.viewport === 'mobile'
  const content = (
    <>
      <span className={styles.text}>
        <span className={styles.name}>{routine.name}</span>
        <span className={classes(styles.detail, mobile && styles.wrap)}>
          {detail}
        </span>
        {mobile ? (
          <span className={styles.facts}>
            <Owner row={row} />
            <LastRun row={row} />
          </span>
        ) : null}
      </span>
      {mobile ? null : <LastRun row={row} />}
      {mobile ? null : <Owner row={row} />}
      <State row={row} />
    </>
  )
  return (
    <li className={styles.item}>
      {to ? (
        <ScreenLink className={classes(styles.row, styles.link)} to={to}>
          {content}
        </ScreenLink>
      ) : (
        <span className={styles.row}>{content}</span>
      )}
    </li>
  )
}

/**
 * The routines of the org. Every member sees each routine (decision 202).
 * Each row shows the name, the repository, the triggers, the state of the
 * last run, the person whose logins the runs use, and whether it is on.
 */
export function RoutineList(props: {
  rows: readonly RoutineRow[]
  /** The routine pages that the mockups draw, by routine. */
  links: Readonly<Record<string, string>>
  viewport: Viewport
}) {
  return (
    <ul aria-label="Routines" className={styles.list}>
      {props.rows.map((row) => (
        <Row
          key={row.routine.key}
          row={row}
          to={props.links[row.routine.key]}
          viewport={props.viewport}
        />
      ))}
    </ul>
  )
}
