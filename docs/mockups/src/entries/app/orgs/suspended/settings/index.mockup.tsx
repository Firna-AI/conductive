import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../../screens/OrgSettingsScreen'

export const suspendedOrgSettings = defineScreen({
  title: 'Settings of a suspended org',
  description:
    'Cal, an admin of Acme, opens the settings after the operator suspended Acme. The notice of the org is at the top of every tab. General shows the name and the initials without fields and without Save, and Delete org is not there.',
  rationale:
    'Nothing in a suspended org can change, also for an admin, so every tab is read-only, as for a member in app/org-settings/member. The sections do not say that only an admin can change them, because the notice says why. The tabs open the other tabs of the suspended org.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, org: 'suspended' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'repositories',
      title: 'Repositories',
      description:
        'The repositories of Acme, without Add and without Remove, also for Cal, an admin.',
      props: { tab: 'repositories' },
    },
    {
      slug: 'cloud-computer',
      title: 'Cloud computer',
      description:
        'The last build, the scripts, and the env vars of Acme, without Build computer and without edit fields. No build runs while the org is suspended.',
      props: { tab: 'computer' },
    },
    {
      slug: 'members',
      title: 'Members',
      description:
        'The members of Acme and their roles, without the invite, the role menus, and Remove, also for Cal, an admin.',
      props: { tab: 'members' },
    },
  ],
})
