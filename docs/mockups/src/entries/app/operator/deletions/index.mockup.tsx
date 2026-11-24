import { defineScreen } from '@mokly/mokly'
import {
  OperatorDeletionsScreen,
  operatorDeletionsSchema,
} from '../../../../screens/OperatorDeletionsScreen'

export const operatorDeletions = defineScreen({
  title: 'Deletions',
  description:
    'The Deletions tab, after Waitlist, lists the account deletion requests that wait for an operator, oldest first. Each row gives an initials disc, the GitHub login, the name on GitHub, and the day of the request. The rows are Kai Tanaka, Noor Aziz, and Rhea Okafor. Each login opens the page of that person with the request, as app/operator/user/deletion and its variants show. A phone keeps both columns. The page of the person gives the email address and the rest of the details. The tab has no search and offers no action on a request.',
  rationale:
    'The user chose option A of decision 4 of the universal Expo app plan on 23 November 2026: a person requests the deletion on the Account page, and operators complete each request. The requests get their own tab after Waitlist, because both tabs list people who wait for an operator. The rows show no email address, because the operator section shows an email address only on the page of a user, as the protocol of the section says. The list holds only the requests that wait, so it needs no search, and the Users tab finds any user. How an operator completes a request is an open question of the plan, so the tab draws no action that completes a request or marks it done. The tab is the first place that lists the requests, so the Overview and the Users tab do not change.',
  relatedDocs: [],
  propSchema: operatorDeletionsSchema,
  props: { list: 'requests' },
  render: (props, context) => (
    <OperatorDeletionsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'empty',
      title: 'No requests',
      description:
        'With no request that waits, the tab says so, and says that a request shows there when a person asks for the deletion of their account.',
      props: { list: 'empty' },
    },
  ],
})
