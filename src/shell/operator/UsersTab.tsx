import { useState } from 'react'
import { TableCell, type TableColumn } from '@firna/ui/table'
import { readUsersPage } from '../../app/api/read-operator'
import { OperatorDirectory } from '../../app/operator-directory'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import {
  operatorUsersPath,
  type OperatorUserSummary,
} from '../../shared/operator'
import { useApp } from '../context'
import type { Viewport } from '../ui/viewport'
import { dayWidth, DirectoryList, type DirectoryKind } from './DirectoryList'
import { formatCount, formatShortDay } from './format'
import { OperatorPage } from './OperatorPage'
import { SearchField } from './SearchField'
import { NameCell, NameLink, TargetMark, TargetState } from './TargetParts'

const columns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'user', label: 'User', flex: 1 },
    { key: 'joined', label: 'Joined', width: dayWidth },
    { key: 'orgs', label: 'Orgs', align: 'right', width: 56 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  ],
  phone: [
    { key: 'user', label: 'User', flex: 1 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  ],
}

const users: DirectoryKind<OperatorUserSummary> = {
  title: 'Users',
  one: 'user',
  many: 'users',
  keys: 'Search by GitHub login, name, or GitHub ID.',
  columns,
}

/**
 * The line under a login: the state of a suspended user or of a person who
 * waits, or else the name.
 */
function detailOf(row: OperatorUserSummary) {
  if (row.status === 'suspended') return <TargetState status="suspended" />
  if (row.appAccess.state === 'waiting') return <TargetState status="waiting" />
  return row.name ?? undefined
}

/**
 * The Users tab of the operator: a search over every user by GitHub login,
 * name, or numeric GitHub ID. With no search, it lists the newest users. The
 * line under a login gives the state of a suspended user or of a person who
 * waits, or else the name.
 */
export function UsersTab(props: { search: string }) {
  const app = useApp()
  const { now, timeZone } = useServices()
  const [directory] = useState(
    () =>
      new OperatorDirectory(app, operatorUsersPath, readUsersPage, (row) =>
        String(row.githubId),
      ),
  )
  const today = now()
  const cell = (row: OperatorUserSummary, key: string) => {
    switch (key) {
      case 'user':
        return (
          <NameCell
            detail={detailOf(row)}
            mark={
              <TargetMark
                size={22}
                target={{ kind: 'user', login: row.login, name: row.name }}
              />
            }
            name={
              <NameLink to={routes.operatorUser(row.githubId)}>
                @{row.login}
              </NameLink>
            }
          />
        )
      case 'joined':
        return (
          <TableCell muted>
            {formatShortDay(row.joinedAt, today, timeZone)}
          </TableCell>
        )
      case 'orgs':
        return <TableCell numeric>{formatCount(row.orgs)}</TableCell>
      default:
        return <TableCell numeric>{formatCount(row.workspaces)}</TableCell>
    }
  }
  return (
    <OperatorPage tab="users" title="Operator">
      <SearchField
        address={routes.operatorUsers}
        label="Search users"
        placeholder="GitHub login, name, or GitHub ID"
        search={props.search}
      />
      <DirectoryList
        cell={cell}
        directory={directory}
        kind={users}
        search={props.search}
      />
    </OperatorPage>
  )
}
