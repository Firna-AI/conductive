import { defineScreen } from '@mokly/mokly'
import {
  hexwavePage,
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgSuspended = defineScreen({
  title: 'Suspended org',
  description:
    'After the suspension, the notice names the time and the operator, and counts the cloud computers that are still stopping. Lift suspension takes the place of Suspend org. Switch account stays, and its question says that the switch build starts at Lift.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { ...hexwavePage, status: 'suspended' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
