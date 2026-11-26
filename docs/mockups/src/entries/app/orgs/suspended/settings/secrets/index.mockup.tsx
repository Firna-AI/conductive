import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../../screens/orgSettingsState'

export const suspendedOrgSettingsSecrets = defineScreen({
  title: 'Secrets',
  description:
    'The secrets of Acme with their descriptions and records, and each value as dots, also for Cal, an admin. The tab has no Add secret, no switch for all agents, no Reveal, no Replace, and no Delete. The mark for all agents shows as words.',
  rationale:
    'Nothing in a suspended org can change, so the Secrets tab is read-only for everyone. A reveal writes a record that every member sees on the row, so it is a change too: the Worker refuses each reveal in a suspended org, and the tab shows no Reveal (secrets decision 14 B).',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, org: 'suspended', tab: 'secrets' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
