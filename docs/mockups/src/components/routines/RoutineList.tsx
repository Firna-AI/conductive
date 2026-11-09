import type { Viewport } from '@mokly/mokly'
import type { RoutineRow } from '../../fixtures/routineRuns'
import { repositories } from '../../fixtures/repositories'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { PersonAvatar } from '../orgs/OrgTile'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import { runStateLabels } from './runCopy'
import { triggersSummary } from './triggerCopy'
import styles from './RoutineList.module.css'

/** The routine pages that the mockups draw, as Cal opens them. */
const routineLinks: Readonly<Record<string, string>> = {
  'review-prs': paths.routine,
  'dependency-updates': paths.routineAdmin,
  'copy-review': paths.routineOwnerLeft,
}

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

function State(props: { row: RoutineRow }) {
  const { active } = props.row.routine
  return (
    <span className={styles.state}>
      <StatusText
        label={active ? 'Active' : 'Off'}
        tone={active ? 'success' : 'muted'}
      />
    </span>
  )
}

function Row(props: { row: RoutineRow; viewport: Viewport }) {
  const { row } = props
  const { routine } = row
  const to = routineLinks[routine.key]
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
  viewport: Viewport
}) {
  return (
    <ul aria-label="Routines" className={styles.list}>
      {props.rows.map((row) => (
        <Row key={row.routine.key} row={row} viewport={props.viewport} />
      ))}
    </ul>
  )
}
