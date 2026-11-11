import { Play } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import { runRoutine } from '../../app/routine-actions'
import { routes, type RoutineTab } from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'
import type { Routine } from '../../shared/routines'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'

/**
 * Run now of the owner, which starts a run of the saved routine at once,
 * also while it is off. Its run shows first in the Runs list, and a phone
 * opens the Runs tab to show it.
 */
export function RunNowButton(props: {
  org: OrgSummary
  routine: Routine
  tab: RoutineTab
}) {
  const { org, routine } = props
  const orgModel = useOrgModel(org.id)
  const navigation = useNavigation()
  const phone = useViewport() === 'phone'
  const start = useAction(async () => {
    await runRoutine(orgModel, routine.id)
    if (phone && props.tab !== 'runs') {
      navigation.push(routes.routine(org.id, routine.id, 'runs'))
    }
  }, 'The run did not start')
  return (
    <ActionButton busy={start.pending} icon={Play} onPress={() => start.run()}>
      Run now
    </ActionButton>
  )
}
