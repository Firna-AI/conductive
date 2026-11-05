import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const members = defineScreen({
  title: 'Members',
  description:
    'The members of Acme, which is on Team: an invite by GitHub login, then each member with their role and the workspaces that they own, and an open invite. The owner changes a role, removes a member, and cancels an invite.',
  rationale:
    'The user decided on 5 November 2026 that orgs have members, invited by their GitHub login, with two roles: owner and member. Only an owner reassigns a workspace or removes a member. On Team the seats follow the people: each member takes a seat, owners too, and an invite adds its seat when the person accepts it. Decision 40 sets how a seat change in the middle of a billing period is charged, so the page does not say it.',
  relatedDocs: [],
  propSchema: orgSettingsSchema,
  props: { ...acmeSettings, tab: 'members' },
  render: (props, context) => (
    <OrgSettingsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'free',
      title: 'Invite on Free',
      description:
        'The owner of Firna, a free org, types a GitHub login to invite. A free org has one member, its owner, so the one way forward is Upgrade, which opens the upgrade on the billing tab.',
      props: { members: 'free' },
      useCasePaths: ['user-flows/upgrade'],
    },
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
        'Priya, a member who is not an owner, sees the members and their roles, without the invite, the role menus, and Remove. The tabs have no Billing, because only owners act on the bill.',
      props: { viewer: 'member' },
    },
  ],
})
