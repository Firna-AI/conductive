import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { StatTile, StatTileRow } from '@firna/ui/chart'
import { SkeletonBar, SkeletonGroup } from '@firna/ui/skeleton'
import type { DailyCount, StateCounts } from './statCounts'
import { Notice } from '../common/Notice'
import { DailyChart } from '../operator/DailyChart'
import tiles from '../operator/OperatorTiles.module.css'
import { WorkspaceStates } from '../operator/WorkspaceStates'
import list from '../operator/WorkspaceStates.module.css'
import { Section } from './Section'

/**
 * The numbers of the Stats tab of the account, for the person signed in:
 * the orgs of the person, the workspaces that the person owns, the
 * automations that the person owns, and the new workspaces and the automation
 * runs of each UTC day of the last 30 days. Of the archived workspaces,
 * Archived counts those in the list, and Removed those that left it.
 */
export type AccountStatsNumbers = {
  orgs: number
  workspaces: { total: number; lastWeek: number }
  workspaceStates: StateCounts
  automations: number
  newWorkspacesByDay: readonly DailyCount[]
  automationRunsByDay: readonly DailyCount[]
}

/** Each tile shares the width of the row, so a phone shows two in a line. */
const tileStyle = { flex: 1 }

/** A placeholder tile takes the least width of a real tile. */
const placeholderTileStyle = { flex: 1, minWidth: 120 }

/** A placeholder row fills its line. */
const rowStyle = { flex: 1 }

const tileKeys = ['workspaces', 'running', 'automations', 'orgs'] as const
const stateKeys = [
  'running',
  'stopped',
  'failed',
  'archived',
  'removed',
] as const
const chartTitles = ['New workspaces', 'Automation runs'] as const

/**
 * The four numbers that lead the tab: the workspaces with the new ones of
 * the last 7 days, the workspaces that run now, the automations, and the orgs.
 */
function StatsTiles(props: { stats: AccountStatsNumbers }) {
  const { stats } = props
  return (
    <section aria-label="Totals" className={tiles.band}>
      <StatTileRow>
        <StatTile
          delta={{ value: stats.workspaces.lastWeek, period: 'in 7 days' }}
          label="Workspaces"
          style={tileStyle}
          value={stats.workspaces.total}
        />
        <StatTile
          label="Running now"
          style={tileStyle}
          value={stats.workspaceStates.running}
        />
        <StatTile
          label="Automations"
          style={tileStyle}
          value={stats.automations}
        />
        <StatTile label="Orgs" style={tileStyle} value={stats.orgs} />
      </StatTileRow>
    </section>
  )
}

/**
 * The Stats tab with its numbers: the tiles, the workspaces by state, and
 * the charts of the new workspaces and of the automation runs. It imports no
 * fixture value, so the app uses it too.
 */
export function StatsNumbers(props: {
  stats: AccountStatsNumbers
  /** The page is as narrow as a phone. */
  narrow: boolean
}) {
  const { stats, narrow } = props
  return (
    <>
      <StatsTiles stats={stats} />
      <WorkspaceStates counts={stats.workspaceStates} />
      <DailyChart
        days={stats.newWorkspacesByDay}
        narrow={narrow}
        title="New workspaces"
      />
      <DailyChart
        days={stats.automationRunsByDay}
        narrow={narrow}
        title="Automation runs"
      />
    </>
  )
}

/**
 * The first load of the Stats tab: the boxes and their titles in place,
 * with placeholders where the numbers come, so that nothing moves when
 * they arrive.
 */
export function StatsLoading() {
  return (
    <>
      <section aria-label="Totals" className={tiles.band}>
        <StatTileRow>
          {tileKeys.map((key) => (
            <SkeletonGroup
              direction="column"
              gap={8}
              key={key}
              style={placeholderTileStyle}
            >
              <SkeletonBar height={10} width={56} />
              <SkeletonBar height={24} width={72} />
              {key === 'workspaces' ? (
                <SkeletonBar height={10} width={88} />
              ) : null}
            </SkeletonGroup>
          ))}
        </StatTileRow>
      </section>
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
    </>
  )
}

/**
 * The numbers could not load. The notice shows no number, because a count
 * that did not load is not zero. `action` is Try again, which reads them
 * again.
 */
export function StatsFailed(props: { action: ReactNode }) {
  return (
    <Notice
      action={props.action}
      icon={CircleAlert}
      title="Your stats could not load"
      tone="danger"
    />
  )
}
