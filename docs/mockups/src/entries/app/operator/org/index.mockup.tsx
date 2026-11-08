import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../screens/OperatorOrgScreen'

export const operatorOrg = defineScreen({
  title: 'Org page',
  description:
    'The page of one org for the operator: its ID, its creation day, its repositories, its workspaces in each state, and its members with their roles. Each member opens their user page. Suspend org in the header asks first. The way back leads to the Orgs tab.',
  rationale:
    'The user asked for a page for each org, where the operator suspends the org or lifts its suspension, in decision 147. It shows counts, names, and roles only, never a chat, a file, or a secret of the org.',
  relatedDocs: [],
  propSchema: operatorOrgSchema,
  props: { status: 'active', dialog: 'none' },
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'suspend',
      title: 'Suspend an org',
      description:
        'Suspend org asks first. Every cloud computer and build of the org stops, and its members can still read it but not change it. A stopped workspace gets no restart near day 14, so its files can be deleted.',
      props: { dialog: 'suspend' },
    },
    {
      slug: 'suspended',
      title: 'Suspended org',
      description:
        'After the suspension, the notice names the time and the operator, and counts the cloud computers that are still stopping. Lift suspension takes the place of Suspend org.',
      props: { status: 'suspended' },
    },
    {
      slug: 'lift',
      title: 'Lift an org',
      description:
        'Lift suspension asks first. Members can change the org again, and its workspaces can start again. A workspace that stopped 14 days ago or more may have lost its files.',
      rationale:
        'Decision 145 B chose a Lift action with a confirm step. Decision 147 puts it on the page of the org.',
      props: { status: 'suspended', dialog: 'lift' },
    },
    {
      slug: 'deleted',
      title: 'Deleted org',
      description:
        'An org that an admin deleted shows the day of the delete and the day when everything is deleted. The operator can still suspend it.',
      props: { status: 'deleted' },
    },
  ],
})
