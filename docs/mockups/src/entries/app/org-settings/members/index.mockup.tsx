import { defineScreen } from '@mokly/mokly'
import {
  acmeSettings,
  OrgSettingsScreen,
  orgSettingsSchema,
} from '../../../../screens/OrgSettingsScreen'

export const members = defineScreen({
  title: 'Members',
  description:
    'The members of Acme, which is on Team: an invite by GitHub login with the free seats, then each member with their role and the workspaces that they own, and an open invite. The owner changes a role, removes a member, and cancels an invite.',
  rationale:
    'The user decided on 5 November 2026 that orgs have members, invited by their GitHub login, with two roles: owner and member. Only an owner reassigns a workspace or removes a member. On Team the org buys seats, and each member and each open invite takes one, so the invite names the free seats and links to Change seats on the billing tab.',
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
  ],
})
