import { defineScreen } from '@mokly/mokly'
import { ApprovalEmailScreen } from '../../../screens/ApprovalEmailScreen'

export const emailsApproval = defineScreen({
  title: 'Approval email',
  description:
    'The email that an approval sends to the primary verified email of the GitHub account, here sam@example.com. It says that the account is ready. Open Conductive opens the app, where the GitHub sign-in leads to Get started. The plain link repeats the address of the button. The footer says why Sam got the email and that a reply reaches a person.',
  rationale:
    'An approval sends one email, to the primary verified email of the GitHub account, as the user chose in decision 162. The subject stays "Your Conductive account is ready". The email shares the layout of the org invitation, without a mark before its heading, because no org sent it.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/sign-up'],
  render: (_props, context) => (
    <ApprovalEmailScreen
      colorScheme={context.colorScheme}
      viewport={context.viewport}
    />
  ),
})
