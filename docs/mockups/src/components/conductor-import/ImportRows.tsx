import { CirclePause, TimerOff } from 'lucide-react'
import type { ConductorRow, Reservation } from '../../fixtures/conductorImport'
import type { Workspace } from '../../fixtures/workspaces'
import { formatSize } from '../chat/sizes'
import { WorkspaceChip } from '../chat/WorkspaceChip'
import { ScreenLink } from '../common/ScreenLink'
import { workspaceLabel } from '../workspaces/label'
import styles from './ImportRows.module.css'

/** The sessions of a row in words, such as "3 sessions". */
export function sessionCount(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`
}

/** The repository, the branch, and the sessions of a row, on one line. */
export function RowFacts(props: { row: ConductorRow }) {
  const { row } = props
  return (
    <span className={styles.facts}>
      <span>{row.repository}</span>
      <span aria-hidden>·</span>
      <code className={styles.branch}>{row.branch}</code>
      <span aria-hidden>·</span>
      <span>{sessionCount(row.sessions)}</span>
    </span>
  )
}

/**
 * The state of an upload of the row that stopped before its end. An
 * unfinished one says how far it got and how long its parts stay, which
 * Try again uses. An expired one says that its parts are gone, so Import
 * sends all of it again from this Mac.
 */
export function ReservationLine(props: {
  row: ConductorRow
  reservation: Reservation
}) {
  const { reservation } = props
  if (reservation.kind === 'unfinished') {
    return (
      <span className={styles.reservation}>
        <CirclePause aria-hidden className={styles.reservationIcon} size={13} />
        Unfinished: {formatSize(reservation.stored)} of{' '}
        {formatSize(props.row.upload)} uploaded, kept until{' '}
        {reservation.keptUntil}
      </span>
    )
  }
  return (
    <span className={styles.reservation}>
      <TimerOff aria-hidden className={styles.reservationIcon} size={13} />
      The unfinished upload expired on {reservation.expiredOn}. Import sends all
      of it again.
    </span>
  )
}

/**
 * The workspace that the import made, as a chip with its state. The chip of
 * Coupon totals at checkout, the one imported workspace that the mockups
 * draw, opens `to`, its screen for the person signed in. Null keeps it
 * static, and every other chip stays static.
 */
export function ImportedChip(props: {
  workspace: Workspace
  to: string | null
}) {
  const { workspace } = props
  const to = workspace.key === 'coupon-totals' ? props.to : null
  return (
    <span className={styles.chip}>
      <WorkspaceChip
        opener={
          to
            ? (chip) => (
                <ScreenLink
                  className={chip.className}
                  title={chip.title}
                  to={to}
                >
                  {chip.children}
                </ScreenLink>
              )
            : undefined
        }
        workspace={{
          label: workspaceLabel(workspace.number),
          name: workspace.name,
          status: workspace.status,
        }}
      />
    </span>
  )
}
