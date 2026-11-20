import { defineScreen } from '@mokly/mokly'
import { OrgSettingsScreen } from '../../../../../screens/OrgSettingsScreen'
import {
  acmeSettings,
  orgSettingsSchema,
} from '../../../../../screens/orgSettingsState'

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
  variants: [
    {
      slug: 'invalid-name',
      title: 'Replace a secret with an older name',
      description:
        'Acme also has Cloudflare (read-only), which Jonas added before new names took only letters, digits, and underscores. Its row is first in the list and shows like the other rows. Cal chose Replace on it. The form holds its description and an empty field of a new value, as for every secret. It has no name field and no error, so the name stays as it is.',
      rationale:
        'Cal chose on 17 November 2026 that existing names keep working, with no rename. Agents still run commands with this secret. The name rule covers only Add secret and Save as secret, so Replace checks no name and changes only the description and the value.',
      props: { secrets: 'replace-older' },
    },
  ],
})
