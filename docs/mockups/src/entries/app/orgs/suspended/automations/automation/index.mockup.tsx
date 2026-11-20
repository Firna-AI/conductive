import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../../screens/automationState'

export const suspendedAutomation = defineScreen({
  title: 'Automation of a suspended org',
  description:
    "Cal's automation that reviews pull requests, after the operator suspended Acme. The notice of the org is at the top. The facts, the triggers, and the prompt show without fields, with the line of the secrets that the runs use, and the page has no Save, Run now, Delete, Turn off, or Add trigger. The runs show the stop of the suspension, and the run that waited in the queue shows as skipped, because Acme is suspended. A phone shows the Automation and Runs tabs, each under the notice.",
  rationale:
    'Nothing in a suspended org can change, also for the owner or an admin, so every person reads the automation. The notice says why, so the page does not say that only the owner can change it. No line names the logins of runs, and no hint warns about pull requests, because a suspended org starts no run. The line of the secrets that the runs use stays, because the settings of a suspended org stay readable.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, org: 'suspended', runs: 'suspended' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'runs',
      title: 'Runs on a phone',
      description:
        'The Runs tab of the same automation on a phone. The notice of the org stays at the top, above the runs. A desktop shows the runs in their column, beside the form under the notice.',
      rationale:
        'A phone shows only the tab that the person chose. The page draws the notice above the content of either tab, so a member who reads the runs still sees the suspension and the abuse address.',
      props: { tab: 'runs' },
    },
    {
      slug: 'unavailable',
      title: 'Not available',
      description:
        'The page of an automation that Acme no longer has, after the operator suspended Acme. The notice of the org is at the top, above the words that this automation is not available. Open Automations opens the automations of the suspended org.',
      rationale:
        'Every view of the automation page of a suspended org shows the notice, also a view without the automation.',
      props: { read: 'unavailable' },
    },
    {
      slug: 'not-loaded',
      title: 'Not loaded',
      description:
        'The page after the read of the automation failed, in the suspended org. The notice of the org is at the top, above the load failure and Try again.',
      props: { read: 'failed' },
    },
  ],
})
