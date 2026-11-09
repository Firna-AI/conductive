import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../../../brand'
import {
  WaitlistScreen,
  waitlistSchema,
} from '../../../../../screens/WaitlistScreen'

export const signInJoinFailed = defineScreen({
  title: 'Join link that did not work',
  description:
    'Sam opened an invite link whose code is used up, and signed in with GitHub. The account exists without app access, so the waitlist opens. A notice above the empty field says that the link is used up, and asks for another invite. A code that an operator disabled, or a code that does not exist, names its own reason.',
  rationale:
    'The sign-in creates the account before it uses the code, so a code that does not work still leaves the person on the waitlist, with an email to come at an approval. The notice names the reason, so the person knows whether to ask for another invite or to check the link.',
  relatedDocs: [],
  address: appDomain,
  propSchema: waitlistSchema,
  props: {
    email: 'verified',
    code: 'used-up',
    from: 'link',
    invitations: 'none',
  },
  render: (props, context) => (
    <WaitlistScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'paused',
      title: 'Sign-ups paused',
      description:
        'Sam opened the invite link while sign-ups are paused. The code of the link stays unused, and the notice asks Sam to open the link again later.',
      rationale:
        'A code that the pause stopped stays unused, also in a link. A signed-in person who waits and opens the link again uses its code at once.',
      props: { code: 'paused' },
    },
  ],
})
