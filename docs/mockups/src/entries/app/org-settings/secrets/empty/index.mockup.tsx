import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const noSecrets = defineScreen({
  title: 'No secrets yet',
  description:
    'Firna, a new org, has no secrets yet. The tab says so, keeps the line about the environment variables, and offers Add secret.',
  rationale:
    'A new org starts with no secrets, as it starts with no env vars. The Capabilities control of New workspace links here when the org has no secrets, as app/new-workspace/capabilities/no-secrets shows.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets', org: 'new' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
