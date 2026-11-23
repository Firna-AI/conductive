import { defineScreen } from '@mokly/mokly'
import {
  hexwavePage,
  OperatorOrgScreen,
  operatorOrgSchema,
} from '../../../../screens/OperatorOrgScreen'

export const operatorOrg = defineScreen({
  title: 'Org page',
  description:
    'The page of one org for the operator: its ID, its creation day, its repositories, its provider account by its ID with Switch account, its workspaces in each state, with Removed apart from Archived, and its members with their names and roles. Hexwave runs on boat, as every org from before e2b does. A member with no name on GitHub shows the login alone. Each member opens their user page. Suspend org in the header asks first, and so does Switch account in the Provider account box. The way back leads to the Orgs tab. The child pages have the question before a switch, a switch that waits, the switch build, Hexwave after the switch, the question before a suspension, the suspended org, the question before a lift, and a deleted org with its own questions.',
  rationale:
    'The user asked for a page for each org, where the operator suspends the org or lifts its suspension, in decision 147, and for the names of its members, in decision 149. It shows counts, names, and roles only, never a chat, a file, or a secret of the org. Each org runs on one provider account, and its page shows it, from e2b decision 222. An e2b decision is a decision of the change that adds E2B as the second sandbox provider. On 20 November 2026 the user asked that an operator can switch an org to another configured account, which reverses the part of e2b decision 222 that dropped the operator move: new workspaces move when the build on the new account succeeds (switch decision 1 B). Option A of e2b decision 221 shows the account IDs on operator screens. The account moved from Details into its own box, so that the switch, its state, and its action sit beside the account that they change.',
  relatedDocs: [],
  useCasePaths: ['user-flows/switch-org-account'],
  propSchema: operatorOrgSchema,
  props: hexwavePage,
  render: (props, context) => (
    <OperatorOrgScreen state={props} viewport={context.viewport} />
  ),
})
