import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const replaceSecret = defineScreen({
  title: 'Replace a secret',
  description:
    'Cal, an admin, chose Replace on VERCEL_TOKEN, a secret that Priya added. The Replace form opens under the row, in the place of the dots and the actions: the description, which Cal can change, and an empty field of a new value, whose hint says that an empty field keeps the current value. Save and Cancel follow. The switch for all agents stays in the row.',
  rationale:
    'Item 9 of the mockups: the Replace form also changes the description, because each request card shows it to the members who answer. The browser has no stored value, so the field of the value starts empty. The same rights apply to both: the creator of the secret or an admin (secrets decision 3 B).',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'secrets', secrets: 'replace' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
})
