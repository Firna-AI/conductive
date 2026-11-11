import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserAccess = defineScreen({
  title: 'Ways in',
  description:
    'App access gives the way in of each user and its time. Here @rho-9 came in with the invite code Launch week, and the label opens a search for that code. The canonical user page shows an account from before the waitlist, and the page of a person who waits shows an approval. The child pages show a referral code, an org invitation, an operator, an approval email that never went, and open sign-up.',
  rationale:
    'The operator traces misuse back to a code, a person, or an org, so each way in links to what let the user in. Each user with app access also has a referral code of their own. The other ways in are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'inviteCode', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
})
