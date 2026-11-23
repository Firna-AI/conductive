import { Copy } from 'lucide-react'
import { Table, TableCell, type TableColumn } from '@firna/ui/table'
import {
  copyComputerLabel,
  formatRunLength,
  longRunsWords,
} from '../../ui/components/operator/longRunsCopy'
import styles from '../../ui/components/operator/LongRuns.module.css'
import { Section } from '../../ui/components/settings/Section'
import { workspaceLabel } from '../../ui/components/workspaces/label'
import { StatusGlyph } from '../../ui/components/workspaces/StatusGlyph'
import { activityPresentation } from '../../ui/components/workspaces/status'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { formatWhen } from '../../app/time'
import type { OperatorLongRun } from '../../shared/operator'
import { IconButton } from '../ui/actions'
import ui from '../ui/ui.module.css'
import { useViewport, type Viewport } from '../ui/viewport'
import { tableSize } from './OverviewParts'
import {
  EmptyRows,
  InlineLink,
  Joined,
  NameCell,
  NameLink,
  TargetState,
} from './TargetParts'
import { useCopyToast } from './useCopyToast'

/**
 * The fixed columns fit their longest text: a login such as @calummoore,
 * an ID with Copy, "41 minutes ago", and "Done, unread" with its glyph.
 * So the org keeps the most room for its name and the state under it.
 */
const allColumns: TableColumn[] = [
  { key: 'org', label: longRunsWords.org, flex: 1 },
  { key: 'owner', label: longRunsWords.owner, width: 104 },
  { key: 'computer', label: longRunsWords.computer, width: 120 },
  { key: 'activity', label: longRunsWords.lastActivity, width: 100 },
  { key: 'run', label: longRunsWords.runningFor, align: 'right', width: 96 },
]

/**
 * The columns of the long runs, which the loading table shares. A phone
 * keeps the org, and the run length with the state mark under it.
 */
export const longRunColumns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: allColumns,
  phone: allColumns.filter(
    (column) => column.key === 'org' || column.key === 'run',
  ),
}

/**
 * The ID of the cloud computer with Copy, for a search on the Orgs tab or
 * in the tools of the provider. Until the computer exists, a dash takes
 * its place, without Copy.
 */
function ComputerCell(props: {
  id: string | null
  copy: (id: string) => void
}) {
  const { id } = props
  if (id === null) {
    return (
      <span className={styles.none}>
        <span aria-hidden>—</span>
        <span className={ui.hidden}>{longRunsWords.noComputer}</span>
      </span>
    )
  }
  return (
    <span className={styles.computer}>
      <span className={styles.id}>{id}</span>
      <IconButton
        icon={Copy}
        label={copyComputerLabel(id)}
        onPress={() => props.copy(id)}
        quiet
      />
    </span>
  )
}

/**
 * The run length at the read of the Overview, with the state mark of the
 * workspace under it: the glyph of the header and its word, so the state
 * never depends on colour.
 */
function RunCell(props: { run: OperatorLongRun; readAt: number }) {
  const { run } = props
  return (
    <span className={styles.run}>
      <span className={styles.length}>
        {formatRunLength(props.readAt - run.runningSince)}
      </span>
      <span className={styles.state}>
        <StatusGlyph status={run.state} />
        {activityPresentation[run.state].label}
      </span>
    </span>
  )
}

/**
 * The org, with the mark of a deleted or suspended org under its name. A
 * phone leaves out the owner, so for an owner who is suspended it adds a
 * line with the login and the mark. The login keeps the mark from reading
 * as a mark of the org.
 */
function OrgCell(props: { run: OperatorLongRun; phone: boolean }) {
  const { run } = props
  const ownerLine =
    props.phone && run.ownerStatus === 'suspended' ? (
      <Joined
        parts={[
          <InlineLink to={routes.operatorUser(run.ownerGithubId)}>
            @{run.ownerLogin}
          </InlineLink>,
          <TargetState status="suspended" />,
        ]}
      />
    ) : undefined
  return (
    <span className={styles.text}>
      <NameCell
        detail={
          run.orgStatus === 'active' ? undefined : (
            <TargetState status={run.orgStatus} />
          )
        }
        mark={null}
        more={ownerLine}
        name={
          <NameLink to={routes.operatorOrg(run.orgId)}>{run.orgName}</NameLink>
        }
      />
    </span>
  )
}

/**
 * The login of the owner, with the workspace number under it. An owner
 * whom an operator suspended has the Suspended mark under the login, in
 * the style of the mark of an org, and the number moves to a third line.
 */
function OwnerCell(props: { run: OperatorLongRun }) {
  const { run } = props
  const suspended = run.ownerStatus === 'suspended'
  const number = (
    <span className={styles.number}>{workspaceLabel(run.workspaceNumber)}</span>
  )
  return (
    <span className={styles.text}>
      <NameCell
        detail={suspended ? <TargetState status="suspended" /> : number}
        mark={null}
        more={suspended ? number : undefined}
        name={
          <NameLink to={routes.operatorUser(run.ownerGithubId)}>
            @{run.ownerLogin}
          </NameLink>
        }
      />
    </span>
  )
}

/**
 * The workspaces whose cloud computers have run the longest since their
 * last start, longest first, up to 10, in the order of the reply. Each
 * run length and each last activity counts to `readAt`, the time of the
 * read, so the rows agree with the time in the header. A last activity
 * that the reply does not know says Unknown, as an unknown time does on
 * the other tabs. The org and the owner open their pages. No row names
 * its workspace.
 */
export function LongRuns(props: {
  runs: readonly OperatorLongRun[]
  readAt: number
}) {
  const { readAt } = props
  const viewport = useViewport()
  const { timeZone } = useServices()
  const copy = useCopyToast()
  const cell = (run: OperatorLongRun, key: string) => {
    switch (key) {
      case 'org':
        return <OrgCell phone={viewport === 'phone'} run={run} />
      case 'owner':
        return <OwnerCell run={run} />
      case 'computer':
        return <ComputerCell copy={copy} id={run.cloudComputerId} />
      case 'activity':
        return (
          <TableCell muted>
            {run.lastActivityAt === null
              ? 'Unknown'
              : formatWhen(readAt, run.lastActivityAt, timeZone)}
          </TableCell>
        )
      default:
        return <RunCell readAt={readAt} run={run} />
    }
  }
  return (
    <Section title={longRunsWords.title}>
      {props.runs.length === 0 ? (
        <EmptyRows>{longRunsWords.empty}</EmptyRows>
      ) : (
        <Table
          accessibilityLabel={longRunsWords.title}
          cell={cell}
          columns={longRunColumns[viewport]}
          rowKey={(run) => run.workspaceId}
          rows={[...props.runs]}
          size={tableSize[viewport]}
        />
      )}
    </Section>
  )
}
