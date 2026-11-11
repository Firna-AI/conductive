import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../../screens/OperatorUserScreen'

export const operatorUserAccessOrgInvitation = defineScreen({
  title: 'Org invitation',
  description:
    '@kt-null came in when they accepted an invitation to Hexwave from @vex-ops, the admin of Hexwave. The org name opens its org page, and the login of the admin opens the page of that user.',
  rationale:
    'The user chose option A of decision 163: org invitations let in any number of people, with no count. So the page traces each invited person to one org and to the admin who sent the invitation, and the operator can suspend both. The record keeps the admin, because an accepted invitation does not stay. Moved here from a saved state of the Ways in page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'orgInvitation', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
})
