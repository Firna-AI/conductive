import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../screens/OperatorUserScreen'

export const operatorUser = defineScreen({
  title: 'User page',
  description:
    'The page of one user for the operator: the name, the GitHub ID, the age of the GitHub account, the join day, and the workspaces that the user owns. App access says how and when the user got in, here before the waitlist started. The referral code gives the code with Copy and Copy join link, its uses, who used them with the day each came in, and Disable code. The orgs of the user follow with their roles, and each org opens its org page. Suspend user in the header asks first. The way back leads to the Users tab. The child pages show Suspend, a suspended user, a person who waits with Approve, each way in, and the disable of the referral code.',
  rationale:
    'The user asked for a page for each user, where the operator suspends the user or lifts the suspension, in decision 147, and for the name, in decision 149. The way in of each user lets the operator trace misuse back to a code or a person, in decision 160. It shows no email address and no content of a workspace.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'active', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
})
