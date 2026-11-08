import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../screens/OperatorUserScreen'

export const operatorUser = defineScreen({
  title: 'User page',
  description:
    'The page of one user for the operator: the GitHub ID, the join day, the workspaces that the user owns, and their orgs with their roles. Each org opens its org page. Suspend user in the header asks first. The way back leads to the Users tab.',
  rationale:
    'The user asked for a page for each user, where the operator suspends the user or lifts the suspension, in decision 147. It shows no email address and no content of a workspace.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { status: 'active', viewer: 'other', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'suspend',
      title: 'Suspend a user',
      description:
        'Suspend user asks first. The user is signed out everywhere and cannot sign in, and no member can start their workspaces until an admin moves them to another member.',
      props: { dialog: 'suspend' },
    },
    {
      slug: 'self',
      title: 'Suspend your own account',
      description:
        'On the page of the operator’s own account, the question warns first: the operator is then signed out, and another operator must lift the suspension. The page still allows it.',
      props: { viewer: 'self', dialog: 'suspend' },
    },
    {
      slug: 'suspended',
      title: 'Suspended user',
      description:
        'The notice names the time and the operator of the suspension. Lift suspension takes the place of Suspend user.',
      props: { status: 'suspended' },
    },
    {
      slug: 'lift',
      title: 'Lift a user',
      description:
        'Lift suspension asks first. The user can sign in again, and their workspaces can start again. A workspace that stopped 14 days ago or more may have lost its files.',
      rationale:
        'Decision 145 B chose a Lift action with a confirm step. Decision 147 puts it on the page of the user.',
      props: { status: 'suspended', dialog: 'lift' },
    },
  ],
})
