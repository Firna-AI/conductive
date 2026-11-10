import { useState } from 'react'
import { TableCell, type TableColumn } from '@firna/ui/table'
import { readOrgsPage } from '../../app/api/read-operator'
import {
  OperatorDirectory,
  type DirectoryResult,
} from '../../app/operator-directory'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import {
  operatorOrgsPath,
  type OperatorOrgMatch,
  type OperatorOrgSummary,
} from '../../shared/operator'
import { useApp } from '../context'
import { useViewport, type Viewport } from '../ui/viewport'
import { dayWidth, DirectoryList, type DirectoryKind } from './DirectoryList'
import { counted, formatCount, formatShortDay } from './format'
import { OperatorPage } from './OperatorPage'
import { SearchField } from './SearchField'
import {
  Joined,
  NameCell,
  NameLink,
  TargetMark,
  TargetState,
  type Target,
} from './TargetParts'

/**
 * The line under the name of an org that a search found by another key. It
 * stays short, so that the state of the org fits after it.
 */
const matchLines: Readonly<Record<OperatorOrgMatch, string>> = {
  'org-id': 'Org ID',
  'cloud-computer-id': 'Cloud computer ID',
  'preview-address': 'Preview address',
}

/** The key of a search that found its orgs by something other than a name. */
const matchKeys: Readonly<Record<OperatorOrgMatch, string>> = {
  'org-id': 'org ID',
  'cloud-computer-id': 'cloud computer ID',
  'preview-address': 'preview address',
}

const columns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'org', label: 'Org', flex: 1 },
    { key: 'created', label: 'Created', width: dayWidth },
    { key: 'members', label: 'Members', align: 'right', width: 76 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
    { key: 'running', label: 'Running', align: 'right', width: 72 },
  ],
  phone: [
    { key: 'org', label: 'Org', flex: 1 },
    { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  ],
}

/**
 * A search that found every org by one key that is not a name, such as a
 * preview address, names that key in place of the search text.
 */
function lookupLine(result: DirectoryResult<OperatorOrgSummary>) {
  const keys = new Set(result.rows.map((row) => row.match))
  const [key] = keys
  const whole =
    result.nextCursor === null && result.rows.length === result.total
  if (!whole || keys.size !== 1 || !key) return null
  const verb = result.total === 1 ? 'matches' : 'match'
  return `${counted(result.total, 'org', 'orgs')} ${verb} this ${matchKeys[key]}.`
}

const orgs: DirectoryKind<OperatorOrgSummary> = {
  title: 'Orgs',
  one: 'org',
  many: 'orgs',
  keys: 'Search by name, org ID, cloud computer ID, or preview address.',
  columns,
  matches: lookupLine,
}

/**
 * The Orgs tab of the operator: a search over every org by name, org ID, cloud
 * computer ID, or preview address. With no search, it lists the newest orgs.
 * Under each name, the line says what a search found when it is not the name,
 * and the state of a suspended or deleted org. A phone, which has no Created
 * column, gives the creation day there.
 */
export function OrgsTab(props: { search: string }) {
  const app = useApp()
  const { now, timeZone } = useServices()
  const phone = useViewport() === 'phone'
  const [directory] = useState(
    () =>
      new OperatorDirectory(
        app,
        operatorOrgsPath,
        readOrgsPage,
        (row) => row.id,
      ),
  )
  const today = now()
  const day = (time: number) => formatShortDay(time, today, timeZone)
  const cell = (row: OperatorOrgSummary, key: string) => {
    switch (key) {
      case 'org': {
        const match = row.match ? matchLines[row.match] : null
        const state =
          row.status === 'active' ? null : <TargetState status={row.status} />
        const created = phone ? `Created ${day(row.createdAt)}` : undefined
        const target: Target = {
          kind: 'org',
          name: row.name,
          initials: row.initials,
        }
        return (
          <NameCell
            detail={
              match === null && state === null ? (
                created
              ) : (
                <Joined parts={[match, state]} />
              )
            }
            mark={<TargetMark size={22} target={target} />}
            name={
              <NameLink to={routes.operatorOrg(row.id)}>{row.name}</NameLink>
            }
          />
        )
      }
      case 'created':
        return <TableCell muted>{day(row.createdAt)}</TableCell>
      case 'members':
        return <TableCell numeric>{formatCount(row.members)}</TableCell>
      case 'workspaces':
        return <TableCell numeric>{formatCount(row.workspaces)}</TableCell>
      default:
        return <TableCell numeric>{formatCount(row.running)}</TableCell>
    }
  }
  return (
    <OperatorPage tab="orgs" title="Operator">
      <SearchField
        address={routes.operatorOrgs}
        label="Search orgs"
        placeholder="Name, org ID, cloud computer ID, or preview address"
        search={props.search}
      />
      <DirectoryList
        cell={cell}
        directory={directory}
        kind={orgs}
        search={props.search}
      />
    </OperatorPage>
  )
}
