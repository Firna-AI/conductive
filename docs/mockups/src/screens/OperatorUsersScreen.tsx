import type { SchemaProps, Viewport } from '@mokly/mokly'
import { TableCell, type TableColumn } from '@firna/ui/table'
import {
  DirectorySearch,
  DirectoryTable,
  NameCell,
  TargetState,
} from '../components/operator/directory'
import { OperatorPage } from '../components/operator/OperatorPage'
import { NameLink, TargetMark } from '../components/operator/targets'
import { operatorTotals } from '../fixtures/operator'
import {
  newestUsers,
  userSearches,
  type UserRow,
} from '../fixtures/operatorUsers'
import { paths } from '../paths'

export const operatorUsersSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['search'],
  properties: {
    /** No search, so the newest users, a search with a match, or none. */
    search: { enum: ['newest', 'name', 'none'] },
  },
} as const

export type OperatorUsersState = SchemaProps<typeof operatorUsersSchema>

const columns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'user', label: 'User', flex: 1 },
    { key: 'joined', label: 'Joined', width: 100 },
    { key: 'orgs', label: 'Orgs', align: 'right', width: 56 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  ],
  mobile: [
    { key: 'user', label: 'User', flex: 1 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  ],
}

/** The line under the login: the state of a suspended user, or the name. */
function detailOf(row: UserRow) {
  if (row.status === 'suspended') return <TargetState status={row.status} />
  return row.name
}

function cell(row: UserRow, key: string) {
  switch (key) {
    case 'user':
      return (
        <NameCell
          detail={detailOf(row)}
          mark={
            <TargetMark
              size={22}
              target={{
                kind: 'user',
                name: row.login,
                initials: row.initials,
              }}
            />
          }
          name={
            <NameLink
              to={
                row.status === 'suspended'
                  ? paths.operatorUserSuspended
                  : paths.operatorUser
              }
            >
              @{row.login}
            </NameLink>
          }
        />
      )
    case 'joined':
      return <TableCell muted>{row.joined}</TableCell>
    case 'orgs':
      return <TableCell numeric>{row.orgs}</TableCell>
    default:
      return <TableCell numeric>{row.workspaces}</TableCell>
  }
}

/** The query, the rows, and the line that counts them, for each search. */
function results(search: OperatorUsersState['search']) {
  switch (search) {
    case 'newest':
      return {
        query: '',
        rows: newestUsers,
        summary: `${operatorTotals.users.total.toLocaleString('en')} users, newest first.`,
      }
    case 'name':
      return { ...userSearches.name, summary: '2 users match “dan”.' }
    case 'none':
      return {
        ...userSearches.none,
        summary: 'Search by GitHub login, name, or GitHub ID.',
      }
  }
}

/**
 * The Users tab of the operator: a search over every user, by GitHub
 * login, name, or numeric GitHub ID. With no search, it lists the newest
 * users. Each user opens their page.
 */
export function OperatorUsersScreen(props: {
  state: OperatorUsersState
  viewport: Viewport
}) {
  const found = results(props.state.search)
  return (
    <OperatorPage tab="users" title="Operator" viewport={props.viewport}>
      <DirectorySearch
        label="Search users"
        placeholder="GitHub login, name, or GitHub ID"
        query={found.query}
      />
      <DirectoryTable
        cell={cell}
        columns={columns}
        empty={`No user matches “${found.query}”.`}
        more={props.state.search === 'newest'}
        rowKey={(row) => row.login}
        rows={found.rows}
        summary={found.summary}
        title="Users"
        viewport={props.viewport}
      />
    </OperatorPage>
  )
}
