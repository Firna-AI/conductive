import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../screens/OperatorOrgScreen'

export const operatorOrg = defineScreen({
  title: 'Org page',
  description:
    'The page of one org for the operator: its ID, its creation day, its repositories, its workspaces in each state, and its members with their names and roles. A member with no name on GitHub shows the login alone. Each member opens their user page. Suspend org in the header asks first. The way back leads to the Orgs tab. The child pages have the question before a suspension, the suspended org, the question before a lift, and a deleted org with its own questions.',
  rationale:
    'The user asked for a page for each org, where the operator suspends the org or lifts its suspension, in decision 147, and for the names of its members, in decision 149. It shows counts, names, and roles only, never a chat, a file, or a secret of the org.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { status: 'active', dialog: 'none' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
