import type { Viewport } from '@mokly/mokly'
import { CircleAlert, RotateCw } from 'lucide-react'
import { StatTileRow } from '@firna/ui/chart'
import { SkeletonBar, SkeletonGroup } from '@firna/ui/skeleton'
import { Table } from '@firna/ui/table'
import { ActionButton } from '../common/actions'
import { Notice } from '../common/Notice'
import { Section } from '../settings/Section'
import { orgColumns, orgTableSize } from './LargestOrgs'
import tiles from './OperatorTiles.module.css'
import list from './WorkspaceStates.module.css'

/** A placeholder tile takes the least width of a real tile. */
const tileStyle = { flex: 1, minWidth: 120 }

/** A placeholder row fills its line. */
const rowStyle = { flex: 1 }

const tileKeys = ['users', 'orgs', 'workspaces', 'running'] as const
const stateKeys = ['running', 'stopped', 'failed', 'archived'] as const
const chartTitles = ['New workspaces', 'New users'] as const

function TilePlaceholders() {
  return (
    <section aria-label="Totals" className={tiles.band}>
      <StatTileRow>
        {tileKeys.map((key) => (
          <SkeletonGroup direction="column" gap={8} key={key} style={tileStyle}>
            <SkeletonBar height={10} width={56} />
            <SkeletonBar height={24} width={72} />
            <SkeletonBar height={10} width={88} />
          </SkeletonGroup>
        ))}
      </StatTileRow>
    </section>
  )
}

/**
 * The first load of the operator page: the boxes and their titles in
 * place, with placeholders where the numbers come, so nothing moves when
 * they arrive.
 */
export function OperatorLoading(props: { viewport: Viewport }) {
  return (
    <>
      <TilePlaceholders />
      <Section title="Suspended">
        <SkeletonBar height={12} width="60%" />
      </Section>
      <Section title="Workspaces">
        <ul aria-hidden className={list.list}>
          {stateKeys.map((key) => (
            <li className={list.row} key={key}>
              <SkeletonGroup style={rowStyle}>
                <SkeletonBar flex={1} height={12} />
                <SkeletonBar height={12} width={64} />
              </SkeletonGroup>
            </li>
          ))}
        </ul>
      </Section>
      {chartTitles.map((title) => (
        <Section key={title} title={title}>
          <SkeletonBar height={180} radius="md" />
        </Section>
      ))}
      <Section title="Largest orgs">
        <Table
          accessibilityLabel="Largest orgs"
          cell={() => null}
          columns={orgColumns[props.viewport]}
          loading
          loadingRowCount={5}
          rowKey={(_, index) => String(index)}
          rows={[]}
          size={orgTableSize[props.viewport]}
        />
      </Section>
    </>
  )
}

/** The numbers could not load. Try again reads them again. */
export function OperatorError() {
  return (
    <Notice
      action={<ActionButton icon={RotateCw}>Try again</ActionButton>}
      icon={CircleAlert}
      title="The numbers could not load"
      tone="danger"
    />
  )
}
