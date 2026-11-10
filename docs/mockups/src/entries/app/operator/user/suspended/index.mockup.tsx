import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserSuspended = defineScreen({
  title: 'Suspended user',
  description:
    'The notice names the time and the operator of the suspension. The referral code shows Disabled, because the operator kept the offer of the question on. Lift suspension takes the place of Suspend user.',
  rationale:
    'Moved here from the user page, which now shows only its canonical screen beside its child pages.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'suspended', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'lift',
      title: 'Lift a user',
      description:
        'Lift suspension asks first. The user can sign in again, and their workspaces can start again. A workspace on the boat account that stopped 14 days ago or more may have lost its files. A lift gives no disabled referral code back.',
      rationale:
        'Decision 145 B chose a Lift action with a confirm step. Decision 147 puts it on the page of the user.',
      movedFrom: 'app/operator/user/lift',
      props: { dialog: 'lift' },
    },
  ],
})
