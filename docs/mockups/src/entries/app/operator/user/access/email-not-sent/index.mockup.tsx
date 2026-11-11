import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../../../brand'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../../screens/OperatorUserScreen'

export const operatorUserAccessEmailNotSent = defineScreen({
  title: 'Approval email not sent',
  description: `An operator approved @kenji-w, and the approval email never went. The Approval email row says “Not sent”, with the reason as a short line under it: “This GitHub account has no verified email.” The other final case reads “Not sent” with “${productName} stopped trying on 9 Nov.”, after 24 hours of tries. The row has no action, because the person keeps app access and sees it at their next visit. The question before this approval is app/operator/user/waiting/approve-no-email.`,
  rationale:
    'The app sends the one approval email to the primary verified email on GitHub, and sends a failed email again for 24 hours, from decision 162. The section shows no email address, so the row names only the reason. Moved here from a saved state of the Ways in page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'emailNotSent', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
})
