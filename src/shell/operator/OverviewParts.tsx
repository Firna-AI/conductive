import { StatTile, StatTileRow } from '@firna/ui/chart'
import { Table, TableCell, type TableColumn } from '@firna/ui/table'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import tiles from '../../../docs/mockups/src/components/operator/OperatorTiles.module.css'
import { routes } from '../../app/router'
import type { OperatorOverview } from '../../shared/operator'
import { AppLink } from '../ui/AppLink'
import { useViewport, type Viewport } from '../ui/viewport'
import { formatCount } from './format'
import { EmptyRows, NameLink } from './TargetParts'

/** Each tile shares the width of the row, so a phone shows two in a line. */
const tileStyle = { flex: 1 }

function WeeklyTile(props: {
  label: string
  count: { total: number; lastWeek: number }
}) {
  return (
    <StatTile
      delta={{ value: props.count.lastWeek, period: 'in 7 days' }}
      label={props.label}
      style={tileStyle}
      value={props.count.total}
    />
  )
}

/**
 * The users: every account, by join day, with the new ones of the last 7
 * days. A line under them counts the people who wait among them, without
 * suspended people, and opens the Waitlist tab.
 */
function UsersTile(props: { overview: OperatorOverview }) {
  const { users, waiting } = props.overview
  return (
    <div className={tiles.users}>
      <StatTile
        delta={{ value: users.lastWeek, period: 'in 7 days' }}
        label="Users"
        value={users.total}
      />
      <AppLink className={tiles.waiting} to={routes.operatorWaitlist()}>
        {`${formatCount(waiting)} on the waitlist`}
      </AppLink>
    </div>
  )
}

/**
 * The four numbers that lead the Overview: users, orgs, and workspaces with
 * their new ones of the last 7 days, and the cloud computers that run now,
 * for workspaces and for builds. The users also count the people on the
 * waitlist.
 */
export function OverviewTiles(props: { overview: OperatorOverview }) {
  const { overview } = props
  return (
    <section aria-label="Totals" className={tiles.band}>
      <StatTileRow>
        <UsersTile overview={overview} />
        <WeeklyTile count={overview.orgs} label="Orgs" />
        <WeeklyTile count={overview.workspaces} label="Workspaces" />
        <StatTile
          label="Running now"
          style={tileStyle}
          value={overview.running.workspaces + overview.running.builds}
        />
      </StatTileRow>
    </section>
  )
}

const allColumns: TableColumn[] = [
  { key: 'name', label: 'Org', flex: 1 },
  { key: 'members', label: 'Members', align: 'right', width: 76 },
  { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  { key: 'running', label: 'Running', align: 'right', width: 72 },
]

/**
 * The columns of the largest orgs, which the loading table shares. A phone
 * leaves out Members, so that each org name keeps one line.
 */
export const largestOrgColumns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: allColumns,
  phone: allColumns.filter((column) => column.key !== 'members'),
}

/** The dense table on desktop, and the touch size on a phone. */
export const tableSize = { desktop: 'sm', phone: 'md' } as const

type LargestOrg = OperatorOverview['largestOrgs'][number]

function cell(org: LargestOrg, key: string) {
  switch (key) {
    case 'name':
      return <NameLink to={routes.operatorOrg(org.id)}>{org.name}</NameLink>
    case 'members':
      return <TableCell numeric>{formatCount(org.members)}</TableCell>
    case 'workspaces':
      return <TableCell numeric>{formatCount(org.workspaces)}</TableCell>
    default:
      return <TableCell numeric>{formatCount(org.running)}</TableCell>
  }
}

/**
 * The five orgs with the most workspaces: their names and counts only.
 * Each name opens the page of its org.
 */
export function LargestOrgs(props: { orgs: readonly LargestOrg[] }) {
  const viewport = useViewport()
  return (
    <Section title="Largest orgs">
      {props.orgs.length === 0 ? (
        <EmptyRows>The orgs with the most workspaces show here.</EmptyRows>
      ) : (
        <Table
          accessibilityLabel="Largest orgs"
          cell={cell}
          columns={largestOrgColumns[viewport]}
          rowKey={(org) => org.id}
          rows={[...props.orgs]}
          size={tableSize[viewport]}
        />
      )}
    </Section>
  )
}
