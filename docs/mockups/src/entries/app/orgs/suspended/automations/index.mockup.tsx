import { defineScreen } from '@mokly/mokly'
import {
  AutomationsScreen,
  automationsSchema,
} from '../../../../../screens/AutomationsScreen'

export const suspendedAutomations = defineScreen({
  title: 'Automations of a suspended org',
  description:
    'Cal, an admin of Acme, opens Automations after the operator suspended Acme. The notice of the org is at the top. The automations show without New automation, and the last run of each shows the stop of the suspension.',
  rationale:
    'An org suspension takes away no access to read, so the Automations link stays in the sidebar and in the list of a phone. Nothing in a suspended org can change, also for an admin, so the page offers no action, as app/orgs/suspended/settings does. A suspended org starts no run. This page has a child page, so it shows only its canonical screen.',
  relatedDocs: [],
  propSchema: automationsSchema,
  props: { list: 'automations', org: 'suspended' },
  render: (props, context) => (
    <AutomationsScreen state={props} viewport={context.viewport} />
  ),
})
