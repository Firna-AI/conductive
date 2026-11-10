import { classes } from '../../../docs/mockups/src/components/common/classes'
import {
  StatusText,
  type StatusTone,
} from '../../../docs/mockups/src/components/common/StatusText'
import styles from '../../../docs/mockups/src/components/routines/RoutineList.module.css'
import { StatusGlyph } from '../../../docs/mockups/src/components/workspaces/StatusGlyph'
import type { ListedRoutine } from '../../app/api/read-routines'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { formatAgo, useNow } from '../../app/time'
import type { Repository } from '../../shared/org-settings'
import { AppLink } from '../ui/AppLink'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { runStateLabel, triggersText } from './routine-copy'

/** The state of the last run and its time, or no run yet. */
function LastRun(props: { routine: ListedRoutine; now: number }) {
  const run = props.routine.lastRun
  if (!run) return <span className={styles.lastRun}>No runs</span>
  const label = runStateLabel(run.state)
  const when = formatAgo(props.now, run.createdAt)
  return (
    <span className={styles.lastRun} title={`Last run: ${label}, ${when}`}>
      <StatusGlyph status={run.state} />
      <span className={ui.hidden}>{`Last run: ${label}, `}</span>
      <span className={styles.when}>{when}</span>
    </span>
  )
}

/** The member whose logins the runs use. */
function Owner(props: { routine: ListedRoutine }) {
  const { owner } = props.routine
  const name = personName(owner)
  return (
    <span className={styles.owner} title={`By ${name}`}>
      <PersonAvatar person={owner} size={18} />
      <span className={ui.hidden}>By </span>
      <span className={styles.ownerName}>{name}</span>
    </span>
  )
}

/**
 * Whether the routine is on. A routine that turned off after three failed
 * runs in a row says so in short, under Off.
 */
function State(props: { routine: ListedRoutine }) {
  const { routine } = props
  const failed = !routine.active && routine.inactiveReason === 'failed_runs'
  let tone: StatusTone = routine.active ? 'success' : 'muted'
  if (failed) tone = 'danger'
  return (
    <span className={styles.state}>
      <StatusText label={routine.active ? 'Active' : 'Off'} tone={tone} />
      {failed ? <span className={styles.reason}>3 failed runs</span> : null}
    </span>
  )
}

/**
 * One routine, with a link to its page. A phone puts the owner and the
 * last run on a third line.
 */
function Row(props: {
  orgId: string
  routine: ListedRoutine
  /** The name of its repository, when the org's list has it. */
  repository: string | undefined
  now: number
  phone: boolean
}) {
  const { routine, phone } = props
  const triggers = triggersText(routine.triggers)
  const detail = props.repository
    ? `${props.repository} · ${triggers}`
    : triggers
  return (
    <li className={styles.item}>
      <AppLink
        className={classes(styles.row, styles.link)}
        to={routes.routine(props.orgId, routine.id)}
      >
        <span className={styles.text}>
          <span className={styles.name}>{routine.name}</span>
          <span className={classes(styles.detail, phone && styles.wrap)}>
            {detail}
          </span>
          {phone ? (
            <span className={styles.facts}>
              <Owner routine={routine} />
              <LastRun now={props.now} routine={routine} />
            </span>
          ) : null}
        </span>
        {phone ? null : <LastRun now={props.now} routine={routine} />}
        {phone ? null : <Owner routine={routine} />}
        <State routine={routine} />
      </AppLink>
    </li>
  )
}

/**
 * The routines of the org. Every member sees each routine. Each row shows
 * the name, the repository, the triggers, the state and the time of the
 * last run, the person whose logins the runs use, and whether it is on.
 */
export function RoutineList(props: {
  orgId: string
  routines: readonly ListedRoutine[]
  repositories: readonly Repository[]
}) {
  const phone = useViewport() === 'phone'
  const now = useNow(30_000)
  const names = new Map(
    props.repositories.map((repository) => [
      repository.id,
      repository.fullName,
    ]),
  )
  return (
    <ul aria-label="Routines" className={styles.list}>
      {props.routines.map((routine) => (
        <Row
          key={routine.id}
          now={now}
          orgId={props.orgId}
          phone={phone}
          repository={names.get(routine.repositoryId)}
          routine={routine}
        />
      ))}
    </ul>
  )
}
