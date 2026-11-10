import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../../../brand'
import {
  WaitlistScreen,
  waitlistSchema,
} from '../../../../../screens/WaitlistScreen'

export const signInWaitlistPaused = defineScreen({
  title: 'Sign-ups paused',
  description:
    'Sam used a code while the operator has paused sign-ups. The notice says to try the code again later, and that it stays unused. The field keeps the code. The pause also stops the Accept of an org invitation, as app/sign-in/waitlist/invited/paused shows.',
  rationale:
    'The pause stops every way in except an approval: invite codes, invite links, and the org invitations of people who wait. A code that the pause stopped stays unused, so nobody loses a code. No email goes out when the pause ends, so the notice asks the person to come back. The screen shows the pause only after a code or an Accept that the pause stopped, because an approval still works during the pause. Moved here from a saved state of the waitlist page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  address: appDomain,
  propSchema: waitlistSchema,
  props: {
    email: 'verified',
    code: 'paused',
    from: 'field',
    invitations: 'none',
  },
  render: (props, context) => (
    <WaitlistScreen state={props} viewport={context.viewport} />
  ),
})
