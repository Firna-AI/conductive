import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { StatTileRow } from '@firna/ui/chart'
import { SkeletonBar, SkeletonGroup } from '@firna/ui/skeleton'
import { Table } from '@firna/ui/table'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { instanceKey } from '../../instanceKey'
import { orgColumns, orgTableSize } from './LargestOrgs'
import { longRunColumns } from './LongRuns'
import { longRunsWords } from '../../../../../src/ui/components/operator/longRunsCopy'
import tiles from '../../../../../src/ui/components/operator/OperatorTiles.module.css'
import list from '../../../../../src/ui/components/operator/WorkspaceStates.module.css'

/** A placeholder tile takes the least width of a real tile. */
const tileStyle = { flex: 1, minWidth: 120 }

/** A placeholder row fills its line. */
const rowStyle = { flex: 1 }

const tileKeys = ['users', 'orgs', 'workspaces', 'running'] as const
const stateKeys = ['running', 'stopped', 'failed', 'archived'] as const
const chartTitles = ['New workspaces', 'New users'] as const

/** The users tile also has the line of the people on the waitlist. */
function TilePlaceholders() {
  return (
    <section aria-label="Totals" className={tiles.band}>
      <StatTileRow>
        {tileKeys.map((key) => (
          <SkeletonGroup direction="column" gap={8} key={key} style={tileStyle}>
            <SkeletonBar height={10} width={56} />
            <SkeletonBar height={24} width={72} />
            <SkeletonBar height={10} width={88} />
            {key === 'users' ? <SkeletonBar height={10} width={104} /> : null}
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
      <section.Component moklyInstance="workspaces-section" title="Workspaces">
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
      </section.Component>
      <section.Component
        moklyInstance="long-runs-section"
        title={longRunsWords.title}
      >
        <Table
          accessibilityLabel={longRunsWords.title}
          cell={() => null}
          columns={longRunColumns[props.viewport]}
          loading
          loadingRowCount={10}
          rowKey={(_, index) => String(index)}
          rows={[]}
          size={orgTableSize[props.viewport]}
        />
      </section.Component>
      {chartTitles.map((title) => (
        <section.Component
          key={title}
          moklyInstance={`${instanceKey(title)}-section`}
          title={title}
        >
          <SkeletonBar height={180} radius="md" />
        </section.Component>
      ))}
      <section.Component
        moklyInstance="largest-orgs-section"
        title="Largest orgs"
      >
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
      </section.Component>
    </>
  )
}

/** The numbers could not load. Try again reads them again. */
export function OperatorError() {
  return (
    <notice.Component
      action={
        <actionButton.Component icon="rotate-cw" moklyInstance="retry-numbers">
          Try again
        </actionButton.Component>
      }
      icon="circle-alert"
      moklyInstance="numbers-error"
      title="The numbers could not load"
      tone="danger"
    />
  )
}
