import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const members = defineScreen({
  title: 'Members',
  description:
    'The members of Acme: an invite by GitHub login, then each member with their role and the workspaces that they own, and an open invite. The owner changes a role, removes a member, and cancels an invite.',
  rationale:
    'The user decided on 5 November 2026 that orgs have members, invited by their GitHub login, with two roles: owner and member. Only an owner reassigns a workspace or removes a member. The product is free for now, as the user chose in decision 45, so any user can invite members.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'members' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'remove',
      title: 'Remove a member',
      description:
        "The owner removes Priya. The dialog says that Priya loses access, and that Priya's workspaces move to the owner who removes the member, whose accounts their agents then use. On a phone it is a sheet.",
      props: { dialog: 'remove-member' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an owner, sees the members and their roles, without the invite, the role menus, and Remove.',
      props: { viewer: 'member' },
    },
  ],
})
