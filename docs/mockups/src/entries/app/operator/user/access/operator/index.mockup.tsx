import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../../screens/OperatorUserScreen'

export const operatorUserAccessOperator = defineScreen({
  title: 'Operator',
  description:
    '@ellie-w came in as an operator: the sign-in gives app access to each user in the operator list of the Worker.',
  rationale:
    'An operator must reach the waitlist, also with a new account. An operator from before the waitlist shows the way in of an existing account. Moved here from a saved state of the Ways in page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'operator', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
})
