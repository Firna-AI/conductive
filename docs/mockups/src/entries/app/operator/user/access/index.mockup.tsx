import { defineScreen } from '@mokly/mokly'
import { productName } from '../../../../../brand'
import {
  OperatorUserScreen,
  operatorUserSchema,
} from '../../../../../screens/OperatorUserScreen'

export const operatorUserAccess = defineScreen({
  title: 'Ways in',
  description:
    'App access gives the way in of each user and its time. Here @rho-9 came in with the invite code Launch week, and the label opens a search for that code. The canonical user page shows an account from before the waitlist, and the page of a person who waits shows an approval. The last screen shows an approval email that never went.',
  rationale:
    'The operator traces misuse back to a code, a person, or an org, so each way in links to what let the user in. Each user with app access also has a referral code of their own.',
  relatedDocs: [],
  propSchema: operatorUserSchema,
  props: { page: 'inviteCode', dialog: 'none' },
  render: (props, context) => (
    <OperatorUserScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'referral-code',
      title: 'Referral code',
      description:
        '@tide-sam came in with the referral code of @dana-k, whose login opens her page. A user who came in by a referral has a referral code too, here with one use.',
      props: { page: 'referralCode' },
    },
    {
      slug: 'org-invitation',
      title: 'Org invitation',
      description:
        '@kt-null came in when they accepted an invitation to Hexwave, whose name opens its org page.',
      props: { page: 'orgInvitation' },
    },
    {
      slug: 'operator',
      title: 'Operator',
      description:
        '@ellie-w came in as an operator: the sign-in gives app access to each user in the operator list of the Worker.',
      rationale:
        'An operator must reach the waitlist, also with a new account. An operator from before the waitlist shows the way in of an existing account.',
      props: { page: 'operator' },
    },
    {
      slug: 'email-not-sent',
      title: 'Approval email not sent',
      description: `An operator approved @kenji-w, and the approval email never went. The Approval email row says “Not sent”, with the reason as a short line under it: “This GitHub account has no verified email.” The other final case reads “Not sent” with “${productName} stopped trying on 9 Nov.”, after 24 hours of tries. The row has no action, because the person keeps app access and sees it at their next visit.`,
      rationale:
        'The app sends the one approval email to the primary verified email on GitHub, and sends a failed email again for 24 hours, from decision 162. The section shows no email address, so the row names only the reason.',
      props: { page: 'emailNotSent' },
    },
  ],
})
