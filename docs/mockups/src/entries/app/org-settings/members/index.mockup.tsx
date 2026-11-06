import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const members = defineScreen({
  title: 'Members',
  description:
    'The members of Acme: an invite by email, then each member with their role and the workspaces that they own, and an open invite with its email. An admin changes a role, removes a member, and cancels an invite.',
  rationale:
    'The user decided on 5 November 2026 that orgs have members. An admin invites a person by email, and the person joins with a GitHub account that has that email verified, as the user chose in decision 78, because a GitHub login can be renamed and taken by another account. Each member still shows their GitHub login. The roles are admin and member, as in Conductor, from decision 54. Only an admin reassigns a workspace or removes a member. The product is free for now, as the user chose in decision 45, so the app sets no member limit.',
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
        "An admin removes Priya. The dialog says that Priya loses access, and that Priya's workspaces move to the admin who removes the member. On a phone it is a sheet.",
      props: { dialog: 'remove-member' },
    },
    {
      slug: 'member',
      title: 'Seen by a member',
      description:
        'Priya, a member who is not an admin, sees the members and their roles, without the invite, the role menus, and Remove.',
      props: { viewer: 'member' },
    },
  ],
})
