import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const suspendedOrgSettingsAgents = defineScreen({
  title: 'Agents',
  description:
    'The org logins of Acme, without Connect, Replace, Remove, switches, or model list, also for Cal, an admin. The Claude login shows its host and the value of its switch in words.',
  rationale:
    'Decision 1 B of the org logins plan of 16 November 2026 adds the Agents tab. A suspended org starts no turn, so its org logins serve nobody until the operator lifts the suspension, and nothing on the tab can change.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, org: 'suspended', tab: 'agents' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
