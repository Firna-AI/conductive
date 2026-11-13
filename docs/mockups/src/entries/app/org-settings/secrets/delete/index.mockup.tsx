import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const deleteSecret = defineScreen({
  title: 'Delete a secret',
  description:
    'Cal, an admin, chose Delete on VERCEL_TOKEN. The dialog asks first: agents can no longer use the secret, and its approvals end in every workspace. On a phone it is a sheet.',
  rationale:
    'A deleted secret ends each of its grants, and its value cannot come back, so Delete asks first with the dialog of the app. A member sees Delete only on the secrets that they added (secrets decision 3 B).',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets', dialog: 'delete-secret' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
