import { useEffect, useState } from 'react'
import { CircleAlert, RefreshCw, RotateCw } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { DailyChart } from '../../../docs/mockups/src/components/operator/DailyChart'
import { WorkspaceStates } from '../../../docs/mockups/src/components/operator/WorkspaceStates'
import { readOperatorOverview } from '../../app/api/read-operator'
import { OperatorRead } from '../../app/operator-read'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import {
  operatorOverviewPath,
  type OperatorOverview,
} from '../../shared/operator'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useViewport } from '../ui/viewport'
import { formatClock } from './format'
import { OperatorPage } from './OperatorPage'
import { OverviewLoading } from './OverviewLoading'
import { LargestOrgs, OverviewTiles } from './OverviewParts'

function OverviewNumbers(props: {
  overview: OperatorOverview
  refreshing: boolean
}) {
  const { overview, refreshing } = props
  const narrow = useViewport() === 'phone'
  return (
    <>
      <OverviewTiles overview={overview} />
      <WorkspaceStates
        builds={overview.running.builds}
        counts={overview.workspaceStates}
        page="overview"
      />
      <DailyChart
        days={overview.newWorkspacesByDay}
        narrow={narrow}
        refreshing={refreshing}
        title="New workspaces"
      />
      <DailyChart
        days={overview.newUsersByDay}
        narrow={narrow}
        refreshing={refreshing}
        title="New users"
      />
      <LargestOrgs orgs={overview.largestOrgs} />
    </>
  )
}

/**
 * The numbers could not load. The notice shows no number, because a count that
 * did not load is not zero. Try again reads them again.
 */
function OverviewError(props: { busy: boolean; retry: () => void }) {
  return (
    <Notice
      action={
        <ActionButton busy={props.busy} icon={RotateCw} onPress={props.retry}>
          Try again
        </ActionButton>
      }
      icon={CircleAlert}
      title="The numbers could not load"
      tone="danger"
    />
  )
}

/**
 * The Overview tab of the operator: live counts across every org, which it
 * reads each time it opens. Refresh in the desktop header reads them again and
 * keeps the numbers until the answer. A phone reads them each time that the
 * page opens, so it has no Refresh.
 */
export function OverviewTab() {
  const app = useApp()
  const { timeZone } = useServices()
  const phone = useViewport() === 'phone'
  const [overview] = useState(
    () => new OperatorRead(app, operatorOverviewPath(), readOperatorOverview),
  )
  useEffect(() => overview.watch(), [overview])
  const numbers = useStore(overview.value)
  const reading = useStore(overview.reading)
  const refresh = () => void overview.refresh()
  const ready = numbers.state === 'ready' ? numbers.value : null
  return (
    <OperatorPage
      actions={
        ready && !phone ? (
          <ActionButton busy={reading} icon={RefreshCw} onPress={refresh}>
            Refresh
          </ActionButton>
        ) : undefined
      }
      subtitle={
        ready ? `Updated at ${formatClock(ready.readAt, timeZone)}` : undefined
      }
      tab="overview"
      title="Operator"
    >
      {numbers.state === 'loading' ? <OverviewLoading /> : null}
      {numbers.state === 'failed' ? (
        <OverviewError busy={reading} retry={refresh} />
      ) : null}
      {ready ? <OverviewNumbers overview={ready} refreshing={reading} /> : null}
    </OperatorPage>
  )
}
