import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserSuspend = defineScreen({
  title: 'Suspend a user',
  description:
    'Suspend user asks first. The user is signed out everywhere and cannot sign in, and no member can start their workspaces until an admin moves them to another member. Each unfinished build that runs for the user stops and fails, and a lift does not bring it back. The question also offers to disable the referral code of the user, on by default.',
  rationale:
    'The referral code of an abuser must not keep letting people in, so the offer is on by default. It stays an offer, because a disable is final and a suspension can be lifted. Moved here from the user page, which now shows only its canonical screen beside its child pages.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'active', dialog: 'suspend' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'self',
      title: 'Suspend your own account',
      description:
        'On the page of the operator’s own account, the question warns first: the operator is then signed out, and another operator must lift the suspension. The page still allows it.',
      movedFrom: 'app/operator/user/self',
      props: { page: 'self' },
    },
  ],
})
