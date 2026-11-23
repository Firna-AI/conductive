import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Copy } from 'lucide-react'
import { Table, TableCell, type TableColumn } from '@firna/ui/table'
import type { LongRun, RunOwner } from '../../fixtures/operatorRuns'
import { instanceKey } from '../../instanceKey'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import a11y from '../../../../../src/ui/components/common/a11y.module.css'
import { section } from '../../entries/components/settings/Section.mockup'
import { workspaceLabel } from '../../../../../src/ui/components/workspaces/label'
import { activityPresentation } from '../../../../../src/ui/components/workspaces/status'
import { StatusGlyph } from '../../../../../src/ui/components/workspaces/StatusGlyph'
import { NameCell, TargetState } from './directory'
import directory from '../../../../../src/ui/components/operator/directory.module.css'
import { orgTableSize } from './LargestOrgs'
import {
  copyComputerLabel,
  formatRunLength,
  longRunsWords,
} from '../../../../../src/ui/components/operator/longRunsCopy'
import { orgPagePaths, userPagePath } from './targetPages'
import { InlineLink, NameLink } from './targets'
import styles from '../../../../../src/ui/components/operator/LongRuns.module.css'

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
  mobile: allColumns.filter(
    (column) => column.key === 'org' || column.key === 'run',
  ),
}

/**
 * The ID of the cloud computer with Copy, for a search on the Orgs tab or
 * in the tools of the provider. Until the computer exists, a dash takes
 * its place, without Copy.
 */
function ComputerCell(props: { id: string | null }) {
  if (props.id === null) {
    return (
      <span className={styles.none}>
        <span aria-hidden>—</span>
        <span className={a11y.hidden}>{longRunsWords.noComputer}</span>
      </span>
    )
  }
  return (
    <span className={styles.computer}>
      <span className={styles.id}>{props.id}</span>
      <IconButton icon={Copy} label={copyComputerLabel(props.id)} quiet />
    </span>
  )
}

/**
 * The run length, with the state mark of the workspace under it: the
 * glyph of the header and its word, so the state never depends on colour.
 */
function RunCell(props: { run: LongRun }) {
  const { runningFor, state } = props.run
  return (
    <span className={styles.run}>
      <span className={styles.length}>{formatRunLength(runningFor)}</span>
      <span className={styles.state}>
        <StatusGlyph status={state} />
        {activityPresentation[state].label}
      </span>
    </span>
  )
}

/**
 * The line that a phone adds under the org for an owner who is suspended,
 * because a phone leaves out the owner. The login keeps the mark from
 * reading as a mark of the org.
 */
function SuspendedOwnerLine(props: { owner: RunOwner; id: string }) {
  const { login, status } = props.owner
  return (
    <>
      <InlineLink to={userPagePath(login, status)}>@{login}</InlineLink>
      {' · '}
      <TargetState id={props.id} status="suspended" />
    </>
  )
}

/**
 * The org, with the mark of a deleted or suspended org under its name. The
 * org shows no mark of its own, as in the largest orgs, so that its name
 * and that state keep their room in a narrow window.
 */
function OrgCell(props: { run: LongRun; viewport: Viewport }) {
  const { org, owner, number } = props.run
  const ownerLine =
    props.viewport === 'mobile' && owner.status === 'suspended' ? (
      <SuspendedOwnerLine
        id={`owner-line-${instanceKey(owner.login)}-${number}`}
        owner={owner}
      />
    ) : undefined
  return (
    <span className={styles.text}>
      <NameCell
        detail={
          org.status === 'active' ? undefined : (
            <TargetState
              id={`org-${instanceKey(org.name)}-${number}`}
              status={org.status}
            />
          )
        }
        mark={null}
        more={ownerLine}
        name={<NameLink to={orgPagePaths[org.status]}>{org.name}</NameLink>}
      />
    </span>
  )
}

/**
 * The login of the owner, with the workspace number under it. An owner
 * whom an operator suspended has the Suspended mark under the login, in
 * the style of the mark of an org, and the number moves to a third line.
 */
function OwnerCell(props: { run: LongRun }) {
  const { owner } = props.run
  const suspended = owner.status === 'suspended'
  const number = (
    <span className={styles.number}>{workspaceLabel(props.run.number)}</span>
  )
  return (
    <span className={styles.text}>
      <NameCell
        detail={
          suspended ? (
            <TargetState
              id={`owner-${instanceKey(owner.login)}-${props.run.number}`}
              status="suspended"
            />
          ) : (
            number
          )
        }
        mark={null}
        more={suspended ? number : undefined}
        name={
          <NameLink to={userPagePath(owner.login, owner.status)}>
            @{owner.login}
          </NameLink>
        }
      />
    </span>
  )
}

/** The cells of a row, for each viewport. */
function cellOf(viewport: Viewport) {
  return function cell(run: LongRun, key: string) {
    switch (key) {
      case 'org':
        return <OrgCell run={run} viewport={viewport} />
      case 'owner':
        return <OwnerCell run={run} />
      case 'computer':
        return <ComputerCell id={run.computer} />
      case 'activity':
        return <TableCell muted>{run.lastActivity}</TableCell>
      default:
        return <RunCell run={run} />
    }
  }
}

/**
 * The workspaces whose cloud computers have run the longest since their
 * last start, longest first, up to 10. A row gives the org with the mark
 * of a deleted or suspended org, the owner with the workspace number and
 * the mark of a suspended owner, the cloud computer ID, the last activity,
 * and the run length with the state. The org and the owner open their
 * pages. No row names its workspace.
 */
export function LongRuns(props: {
  runs: readonly LongRun[]
  viewport: Viewport
}) {
  return (
    <section.Component
      moklyInstance="long-runs-section"
      title={longRunsWords.title}
    >
      {props.runs.length === 0 ? (
        <p className={directory.empty}>{longRunsWords.empty}</p>
      ) : (
        <Table
          accessibilityLabel={longRunsWords.title}
          cell={cellOf(props.viewport)}
          columns={longRunColumns[props.viewport]}
          rowKey={(run) => `${run.org.name} ${run.number}`}
          rows={[...props.runs]}
          size={orgTableSize[props.viewport]}
        />
      )}
    </section.Component>
  )
}
