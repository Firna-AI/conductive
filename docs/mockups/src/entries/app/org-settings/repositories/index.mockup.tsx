import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const repositories = defineScreen({
  title: 'Repositories',
  description:
    'The repositories that the org bundles into its cloud computer, chosen from those that the shared GitHub App can reach. A change takes effect at the next build of the computer.',
  rationale:
    'Repositories keep their own tab, as the user asked. Waits on decisions 10 and 21, drawn as their recommended options at org level: an admin chooses the repositories of the org, from one GitHub App that every org shares.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'repositories' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, sees the three repositories of Acme, without the search, Add, and Remove. One line says that only an admin can change them.',
      rationale:
        'The user chose option B of decision 57: only admins change the repositories, the scripts, and the environment variables, because a change reaches every new sandbox of the org. Members see them read-only.',
      props: { viewer: 'member' },
    },
  ],
})
