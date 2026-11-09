import { defineScreen } from '@mokly/mokly'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserWaiting = defineScreen({
  title: 'Person who waits',
  description:
    'The page of a person on the waitlist. The notice says since when they wait, and that they see only the waitlist screen. The page has no app access, no referral code, and no orgs yet. Approve sits in the header beside Suspend user.',
  rationale:
    'The Users tab finds a person who waits too, so the operator can approve them from their page as from the Waitlist tab. Approve works only for a person who waits.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'waiting', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'approve',
      title: 'Approve',
      description:
        'Approve asks the same question as on the Waitlist tab: it names the person, says that an email tells them, because their GitHub account has a verified email, and says that an approval is final.',
      props: { dialog: 'approve' },
    },
    {
      slug: 'approved',
      title: 'Approved, email not sent yet',
      description:
        'After the approval, App access names the operator who approved and the time. The approval email did not go yet, and the app tries again on its own. The new referral code has no uses yet.',
      rationale:
        'The approval saves its email and sends it at once. The 15-minute Cron Trigger sends a failed email again, so the page states the fact calmly and offers no action.',
      props: { page: 'approved' },
    },
    {
      slug: 'emailed',
      title: 'Approved, email sent',
      description: 'Once the email goes, App access gives the time it went.',
      props: { page: 'emailed' },
    },
    {
      slug: 'approve-no-email',
      title: 'Approve, no verified email',
      description:
        'The question before Approve on the page of @kenji-w, whose GitHub account has no verified email. It says that Kenji gets app access now and sees it at their next visit, and that no email goes out, because the account has no verified email. Approve leads to the page after the approval, whose Approval email row says “Not sent”.',
      rationale:
        'The approval email goes only to the primary verified email on GitHub, as the user chose in decision 162. So the question promises an email only to a person who has one. The section shows no email address, only whether one exists. The person keeps app access and sees it at their next visit, so the question names no other step.',
      props: { page: 'waitingNoEmail', dialog: 'approve' },
    },
  ],
})
