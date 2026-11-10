import { StatTile, StatTileRow } from '@firna/ui/chart'
import {
  operatorTotals,
  runningComputers,
  type WeeklyCount,
} from '../../fixtures/operator'
import { waitlistTotal } from '../../fixtures/operatorWaitlist'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import styles from './OperatorTiles.module.css'

/** Each tile shares the width of the row, so a phone shows two in a line. */
const tileStyle = { flex: 1 }

function WeeklyTile(props: { label: string; count: WeeklyCount }) {
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
 * days. A line under them counts the people who wait among them, and opens
 * the Waitlist tab.
 */
function UsersTile() {
  return (
    <div className={styles.users}>
      <StatTile
        delta={{ value: operatorTotals.users.lastWeek, period: 'in 7 days' }}
        label="Users"
        value={operatorTotals.users.total}
      />
      <ScreenLink className={styles.waiting} to={paths.operatorWaitlist}>
        {waitlistTotal} on the waitlist
      </ScreenLink>
    </div>
  )
}

/**
 * The four numbers that lead the operator page: users, orgs, and
 * workspaces with their new ones of the last 7 days, and the cloud
 * computers that run now, for workspaces and for builds. The users also
 * count the people on the waitlist.
 */
export function OperatorTiles() {
  return (
    <section aria-label="Totals" className={styles.band}>
      <StatTileRow>
        <UsersTile />
        <WeeklyTile count={operatorTotals.orgs} label="Orgs" />
        <WeeklyTile count={operatorTotals.workspaces} label="Workspaces" />
        <StatTile
          label="Running now"
          style={tileStyle}
          value={runningComputers.workspaces + runningComputers.builds}
        />
      </StatTileRow>
    </section>
  )
}
