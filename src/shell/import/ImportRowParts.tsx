import { CirclePause, Info } from 'lucide-react'
import { formatSize } from '../../../docs/mockups/src/components/chat/sizes'
import { WorkspaceChip } from '../../../docs/mockups/src/components/chat/WorkspaceChip'
import styles from '../../../docs/mockups/src/components/conductor-import/ImportList.module.css'
import rowStyles from '../../../docs/mockups/src/components/conductor-import/ImportRows.module.css'
import { workspaceLabel } from '../../../docs/mockups/src/components/workspaces/label'
import type { ImportRow } from '../../app/import/import-uploads'
import { routes } from '../../app/router'
import { formatDay } from '../../app/time'
import { nameLabel } from '../../shared/name-label'
import type { Workspace } from '../../shared/workspaces'
import { AppLink } from '../ui/AppLink'

/** A count of sessions in words, such as "3 sessions". */
export function sessionCount(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`
}

/**
 * The size that a row uploads. The Mac estimates it from the metadata of
 * the workspace, so it reads as an estimate. A row with no estimate names
 * no size.
 */
export function estimatedSize(bytes: number | null): string | null {
  return bytes === null ? null : `About ${formatSize(bytes)}`
}

/**
 * The repository, the branch, and the sessions of a row, on one line. A
 * fact that the Mac does not know stays out.
 */
export function RowFacts(props: { row: ImportRow }) {
  const { row } = props
  const facts = [
    row.repository ? <span key="repository">{row.repository}</span> : null,
    row.branch ? (
      <code className={rowStyles.branch} key="branch">
        {row.branch}
      </code>
    ) : null,
    row.sessionCount === null ? null : (
      <span key="sessions">{sessionCount(row.sessionCount)}</span>
    ),
  ].filter((fact) => fact !== null)
  return (
    <span className={rowStyles.facts}>
      {facts.flatMap((fact, index) =>
        index === 0
          ? [fact]
          : [
              <span aria-hidden key={`dot-${index}`}>
                ·
              </span>,
              fact,
            ],
      )}
    </span>
  )
}

/**
 * Why a row cannot import: the org did not choose its repository. An admin
 * gets the way to the Repositories tab, and a member reads that an admin
 * adds it.
 */
export function Unavailable(props: {
  row: ImportRow
  orgId: string
  orgName: string
  admin: boolean
}) {
  const { row } = props
  const text = row.repository
    ? props.admin
      ? `Add ${row.repository} to ${props.orgName} first.`
      : `An admin of ${props.orgName} can add ${row.repository}.`
    : 'A workspace with a GitHub repository can import.'
  return (
    <span className={styles.unavailable}>
      <Info aria-hidden className={styles.infoIcon} size={13} />
      {text}
      {props.admin && row.repository ? (
        <AppLink
          className={styles.link}
          to={routes.settings(props.orgId, 'repositories')}
        >
          Add repository
        </AppLink>
      ) : null}
    </span>
  )
}

/**
 * How far the stopped upload of a row got, from the bytes that the server
 * verified, and how long its parts stay for Try again.
 */
export function ReservationLine(props: {
  row: Extract<ImportRow, { state: 'unfinished' }>
  timeZone?: string
}) {
  const { row } = props
  const estimate =
    row.uploadBytes === null ? '' : ` of about ${formatSize(row.uploadBytes)}`
  return (
    <span className={rowStyles.reservation}>
      <CirclePause
        aria-hidden
        className={rowStyles.reservationIcon}
        size={13}
      />
      Unfinished: {formatSize(row.storedBytes)}
      {estimate} uploaded, kept until {formatDay(row.expiresAt, props.timeZone)}
    </span>
  )
}

/**
 * The workspace that an import made, as a chip with its state, which
 * opens it. Without its record in the list of the org, the chip names the
 * workspace by the name of its row.
 */
export function ImportedChip(props: {
  orgId: string
  workspaceId: string
  workspace: Workspace | undefined
  name: string
}) {
  const { workspace } = props
  const to = routes.workspace(props.orgId, props.workspaceId)
  if (!workspace) {
    return (
      <AppLink className={styles.link} to={to}>
        {props.name}
      </AppLink>
    )
  }
  return (
    <span className={rowStyles.chip}>
      <WorkspaceChip
        opener={(chip) => (
          <AppLink className={chip.className} title={chip.title} to={to}>
            {chip.children}
          </AppLink>
        )}
        workspace={{
          label: workspaceLabel(workspace.number),
          name: nameLabel(workspace.name),
          status: workspace.state,
        }}
      />
    </span>
  )
}
