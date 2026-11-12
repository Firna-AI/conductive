import type { SchemaProps, Viewport } from '@mokly/mokly'
import { TableCell, type TableColumn } from '@firna/ui/table'
import { SearchField } from '../components/common/SearchField'
import {
  AccountId,
  DirectoryTable,
  NameCell,
  TargetState,
} from '../components/operator/directory'
import { OperatorPage } from '../components/operator/OperatorPage'
import { orgAccountWords } from '../components/operator/providerCopy'
import { NameLink, TargetMark } from '../components/operator/targets'
import { operatorTotals } from '../fixtures/operator'
import {
  newestOrgs,
  orgSearches,
  type OrgRow,
  type TargetStatus,
} from '../fixtures/operatorDirectory'
import { paths } from '../paths'

export const operatorOrgsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['search'],
  properties: {
    /**
     * No search, so the newest orgs, a search by name, a search by a
     * preview address, or a search with no match.
     */
    search: { enum: ['newest', 'name', 'preview', 'none'] },
  },
} as const

export type OperatorOrgsState = SchemaProps<typeof operatorOrgsSchema>

const columns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'org', label: 'Org', flex: 1 },
    { key: 'created', label: 'Created', width: 100 },
    { key: 'account', label: orgAccountWords.term, width: 76 },
    { key: 'members', label: 'Members', align: 'right', width: 76 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
    { key: 'running', label: 'Running', align: 'right', width: 72 },
  ],
  mobile: [
    { key: 'org', label: 'Org', flex: 1 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  ],
}

/** The page of an org in each state. */
const orgPaths: Readonly<Record<TargetStatus, string>> = {
  active: paths.operatorOrg,
  suspended: paths.operatorOrgSuspended,
  deleted: paths.operatorOrgDeleted,
}

/**
 * The line under the name: what a search matched, and the state of a
 * suspended or deleted org. A phone has no Created column, so the line of
 * an org in use that a name found gives its creation day.
 */
function lineOf(row: OrgRow, viewport: Viewport) {
  const state =
    row.status === 'active' ? null : <TargetState status={row.status} />
  if (row.match && state) {
    return (
      <>
        {row.match} · {state}
      </>
    )
  }
  if (row.match) return row.match
  if (state) return state
  return viewport === 'mobile' ? `Created ${row.created}` : undefined
}

/**
 * The second line of a phone, which has no Account column: the provider
 * account that the org runs on.
 */
function AccountLine(props: { row: OrgRow }) {
  return (
    <>
      {orgAccountWords.runsOn} <AccountId id={props.row.account} />
    </>
  )
}

function cellOf(viewport: Viewport) {
  return function cell(row: OrgRow, key: string) {
    switch (key) {
      case 'org':
        return (
          <NameCell
            detail={lineOf(row, viewport)}
            mark={<TargetMark size={22} target={{ kind: 'org', ...row }} />}
            more={viewport === 'mobile' ? <AccountLine row={row} /> : undefined}
            name={<NameLink to={orgPaths[row.status]}>{row.name}</NameLink>}
          />
        )
      case 'created':
        return <TableCell muted>{row.created}</TableCell>
      case 'account':
        return <AccountId id={row.account} />
      case 'members':
        return <TableCell numeric>{row.members}</TableCell>
      case 'workspaces':
        return <TableCell numeric>{row.workspaces}</TableCell>
      default:
        return <TableCell numeric>{row.running}</TableCell>
    }
  }
}

/** The query, the rows, and the line that counts them, for each search. */
function results(search: OperatorOrgsState['search']) {
  switch (search) {
    case 'newest':
      return {
        query: '',
        rows: newestOrgs,
        summary: `${operatorTotals.orgs.total} orgs, newest first.`,
      }
    case 'name':
      return { ...orgSearches.name, summary: '2 orgs match “north”.' }
    case 'preview':
      return {
        ...orgSearches.preview,
        summary: '1 org matches this preview address.',
      }
    case 'none':
      return {
        ...orgSearches.none,
        summary:
          'Search by name, org ID, cloud computer ID, or preview address.',
      }
  }
}

/**
 * The Orgs tab of the operator: a search over every org, by name, org ID,
 * the ID of a cloud computer, or a preview address. With no search, it
 * lists the newest orgs. Each row gives the provider account of the org by
 * its ID, in a column on desktop and in a second line on a phone. Each org
 * opens its page.
 */
export function OperatorOrgsScreen(props: {
  state: OperatorOrgsState
  viewport: Viewport
}) {
  const found = results(props.state.search)
  return (
    <OperatorPage tab="orgs" title="Operator" viewport={props.viewport}>
      <SearchField
        label="Search orgs"
        placeholder="Name, org ID, cloud computer ID, or preview address"
        query={found.query}
      />
      <DirectoryTable
        cell={cellOf(props.viewport)}
        columns={columns}
        empty={`No org matches “${found.query}”.`}
        more={props.state.search === 'newest'}
        rowKey={(row) => row.name}
        rows={found.rows}
        summary={found.summary}
        title="Orgs"
        viewport={props.viewport}
      />
    </OperatorPage>
  )
}
