import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../../screens/OperatorOrgScreen'

export const operatorOrgLift = defineScreen({
  title: 'Lift an org',
  description:
    'Lift suspension asks first. Members can change the org again, and its workspaces can start again. A workspace that stopped 14 days ago or more may have lost its files.',
  rationale:
    'Decision 145 B chose a Lift action with a confirm step. Decision 147 puts it on the page of the org.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { status: 'suspended', dialog: 'lift' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
