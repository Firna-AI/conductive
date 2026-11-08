import type { Viewport } from '@mokly/mokly'
import { Table, TableCell, type TableColumn } from '@firna/ui/table'
import { largestOrgs, type OrgCounts } from '../../fixtures/operator'
import { paths } from '../../paths'
import { Section } from '../settings/Section'
import { NameLink } from './targets'

const allColumns: TableColumn[] = [
  { key: 'name', label: 'Org', flex: 1 },
  { key: 'members', label: 'Members', align: 'right', width: 76 },
  { key: 'workspaces', label: 'Workspaces', align: 'right', width: 92 },
  { key: 'running', label: 'Running', align: 'right', width: 72 },
]

/**
 * The columns of the largest orgs, which the loading table shares. A
 * phone leaves out Members, so that each org name keeps one line.
 */
export const orgColumns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: allColumns,
  mobile: allColumns.filter((column) => column.key !== 'members'),
}

/** The dense table on desktop, and the touch size on a phone. */
export const orgTableSize = { desktop: 'sm', mobile: 'md' } as const

function cell(org: OrgCounts, key: string) {
  switch (key) {
    case 'name':
      return <NameLink to={paths.operatorOrg}>{org.name}</NameLink>
    case 'members':
      return <TableCell numeric>{org.members}</TableCell>
    case 'workspaces':
      return <TableCell numeric>{org.workspaces}</TableCell>
    default:
      return <TableCell numeric>{org.running}</TableCell>
  }
}

/**
 * The five orgs with the most workspaces: their names and their counts
 * only. Each name opens the page of its org.
 */
export function LargestOrgs(props: { viewport: Viewport }) {
  return (
    <Section title="Largest orgs">
      <Table
        accessibilityLabel="Largest orgs"
        cell={cell}
        columns={orgColumns[props.viewport]}
        rowKey={(org) => org.name}
        rows={[...largestOrgs]}
        size={orgTableSize[props.viewport]}
      />
    </Section>
  )
}
