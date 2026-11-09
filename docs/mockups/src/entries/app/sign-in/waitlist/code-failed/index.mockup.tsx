import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../../../brand'
import {
  WaitlistScreen,
  waitlistSchema,
} from '../../../../../screens/WaitlistScreen'

export const signInWaitlistCodeFailed = defineScreen({
  title: 'Code not found',
  description:
    'Sam typed a code that does not exist. The field keeps the text with a red outline, and the reason shows under it with one thing to do: check it and try again. A code that an operator disabled, or that is used up, names its own reason and asks for another one. The code control of mockups:serve shows each reason.',
  rationale:
    'Each reason has its own words, so the person knows whether to fix the code, ask for another one, or come back later. The reasons are unknown, disabled, used up, and the pause. Nobody can guess a random code of 10 characters, so the field has no limit on attempts. Moved here from a saved state of the waitlist page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  address: appDomain,
  propSchema: waitlistSchema,
  props: {
    email: 'verified',
    code: 'unknown',
    from: 'field',
    invitations: 'none',
  },
  render: (props, context) => (
    <WaitlistScreen state={props} viewport={context.viewport} />
  ),
})
