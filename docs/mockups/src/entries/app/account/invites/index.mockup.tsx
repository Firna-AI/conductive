import { defineScreen } from '@mokly/mokly'
import { AccountScreen, accountSchema } from '../../../../screens/AccountScreen'

export const accountInvites = defineScreen({
  title: 'Invite code, sign-ups paused',
  description:
    'The operator has paused sign-ups. The invite link and Copy stay, and 3 of 5 invites are still left. A notice in place of the description says that the link works again when sign-ups resume.',
  rationale:
    'The pause stops invite codes, invite links, and the org invitations of people who wait. A code that the pause stopped stays unused, so the count does not drop. A person who opens the link during the pause joins the waitlist, and can open it again after the pause. The user can still share the link, so Copy stays.',
  relatedDocs: [],
  propSchema: accountSchema,
  props: { connections: 'connected', form: 'none', invites: 'paused' },
  render: (props, context) => (
    <AccountScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'used-up',
      title: 'Every invite used',
      description:
        'All 5 invites are used, so 0 of 5 are left. The section says that the invites let 5 people skip the waitlist, and shows no link and no Copy.',
      rationale:
        'Used invites do not come back, as the design of the waitlist plan says. A used-up link lets nobody in, so the page does not offer it. The page names nobody who used an invite.',
      props: { invites: 'used-up' },
    },
    {
      slug: 'disabled',
      title: 'Turned off',
      description:
        'An operator disabled the invite code. The section says Off, and that the product turned off the code. It shows no link, no Copy, and no count.',
      rationale:
        'An operator can disable the invite code of a user, such as a code that leaked, also from the Suspend dialog of that user. A disable is final, so the page offers nothing to turn it on again. The words name no operator and no reason.',
      props: { invites: 'disabled' },
    },
  ],
})
