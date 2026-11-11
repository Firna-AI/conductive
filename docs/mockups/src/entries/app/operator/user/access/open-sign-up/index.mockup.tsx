import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../../screens/OperatorUserScreen'

export const operatorUserAccessOpenSignUp = defineScreen({
  title: 'Open sign-up',
  description:
    '@mira-l signed in for the first time while the waitlist was off, and got app access at once. App access says “Open sign-up by @calummoore”, the operator who turned off the waitlist, with the time of the grant. Open sign-up sends no email, so the page has no Approval email row.',
  rationale:
    'The user chose option A of decision 230 on 9 November 2026: while the waitlist is off and sign-ups are not paused, each sign-in gets app access with the source open sign-up. The record names the operator who last turned off the waitlist, so each grant traces back to a person, as an approval does.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'openSignUp', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'waited',
      title: 'Open sign-up after a wait',
      description:
        '@noor-a joined the waitlist on 5 Nov, and came back after the operator turned off the waitlist. The first request of that visit gave app access, so Joined and Since show different days. The source is open sign-up.',
      rationale:
        'A person who waits gets app access at their next request during open sign-up, while they are at the app, so no email goes out. A grant to everyone at once would also count people who never come back.',
      props: { page: 'openSignUpWaited' },
    },
  ],
})
