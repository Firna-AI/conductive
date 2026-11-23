import { defineComponent } from '@mokly/mokly'
import { InviteCodeSection } from '../../../components/settings/InviteCodeSection'
import { inviteStates } from '../../../../../../src/ui/components/settings/inviteCodeCopy'

/** The invite code of the user, registered with Mokly. */
export const inviteCodeSection = defineComponent({
  slug: 'invite-code-section',
  title: 'Invite code section',
  description:
    'The invite code of the user, at the end of the General tab of the account: the invite link with Copy, the code, and how many of the invites are left. During the pause of sign-ups, and during open sign-up, a notice says so, and the link stays. A code that is used up or turned off shows no link. Its own page shows a code with invites left.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['state', 'fresh', 'openSignUp'],
    properties: {
      state: { enum: inviteStates },
      /** The user just got in, so no invite is used yet. */
      fresh: { type: 'boolean' },
      /** Anyone can sign up now, without an invite. */
      openSignUp: { type: 'boolean' },
    },
  } as const,
  props: { state: 'left', fresh: false, openSignUp: false },
  render: (props) => (
    <InviteCodeSection
      fresh={props.fresh}
      openSignUp={props.openSignUp}
      state={props.state}
    />
  ),
  variants: [
    {
      slug: 'paused',
      title: 'Sign-ups paused',
      description: 'The pause of sign-ups: a notice above the link.',
      props: { state: 'paused' },
    },
    {
      slug: 'open-sign-up',
      title: 'Open sign-up',
      description: 'Anyone can sign up now: a notice above the link.',
      props: { openSignUp: true },
    },
    {
      slug: 'used-up',
      title: 'Used up',
      description: 'Every invite is used: no link.',
      props: { state: 'used-up' },
    },
    {
      slug: 'disabled',
      title: 'Turned off',
      description: 'An operator turned the code off: Off, and no link.',
      props: { state: 'disabled' },
    },
  ],
})
