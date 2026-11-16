import { Play } from 'lucide-react'
import { useNavigation } from '../../app/navigation'
import { runAutomation } from '../../app/automation-actions'
import { routes, type AutomationTab } from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'
import type { Automation } from '../../shared/automations'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'

/**
 * Run now of the owner, which starts a run of the saved automation at once,
 * also while it is off. Its run shows first in the Runs list, and a phone
 * opens the Runs tab to show it.
 */
export function RunNowButton(props: {
  org: OrgSummary
  automation: Automation
  tab: AutomationTab
}) {
  const { org, automation } = props
  const orgModel = useOrgModel(org.id)
  const navigation = useNavigation()
  const phone = useViewport() === 'phone'
  const start = useAction(async () => {
    await runAutomation(orgModel, automation.id)
    if (phone && props.tab !== 'runs') {
      navigation.push(routes.automation(org.id, automation.id, 'runs'))
    }
  }, 'The run did not start')
  return (
    <ActionButton busy={start.pending} icon={Play} onPress={() => start.run()}>
      Run now
    </ActionButton>
  )
}
