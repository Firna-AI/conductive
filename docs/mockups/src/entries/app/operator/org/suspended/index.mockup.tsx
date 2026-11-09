import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgSuspended = defineScreen({
  title: 'Suspended org',
  description:
    'After the suspension, the notice names the time and the operator, and counts the cloud computers that are still stopping. Lift suspension takes the place of Suspend org.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { status: 'suspended', dialog: 'none' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
