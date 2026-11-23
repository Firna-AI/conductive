import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserDeletion = defineScreen({
  title: 'Deletion requested',
  description:
    'The page of Dana Kim after she requested the deletion of her account, as a row of the Deletions tab opens it. A notice at the top gives the day of the request. The rest is her page in use: her email address, her GitHub account, her workspaces, her app access, her referral code, and her orgs with her role in each. Dana is the admin of Dana’s Lab and a member of Hexwave.',
  rationale:
    'The page gives the operator what a check of the person needs, in one place: the email address, which the list leaves out, the workspaces that the person owns, and the orgs with their roles. The notice offers no action, because the plan has not decided how an operator completes a request. Suspend user stays in the header, because a request changes nothing else of the account.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'deletion', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
})
