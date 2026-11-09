import { defineScreen } from '@mokly/mokly'
import {
  OperatorWaitlistScreen,
  operatorWaitlistSchema,
} from '../../../../screens/OperatorWaitlistScreen'

export const operatorWaitlist = defineScreen({
  title: 'Waitlist',
  description:
    'The Waitlist tab lists the people who wait for app access, oldest first, 20 at a time with Show more. Each row gives an initials disc, the GitHub login as a link to the GitHub profile, the name, the age of the GitHub account, the join day, and Approve. A phone gives the age under the name, and leaves out the join day, as the Users tab leaves out its columns. The search finds a person who waits by GitHub login, name, or numeric GitHub ID.',
  rationale:
    'The user asked on 8 November 2026 that the operator sees the people on the waitlist and approves specific users, in decision 160. The row shows no picture and no email address, because the operator section shows only counts, names, IDs, dates, roles, and states. The GitHub profile and the age of the account let the operator judge a person.',
  relatedDocs: [],
  propSchema: operatorWaitlistSchema,
  props: { list: 'oldest', dialog: 'none', signUps: 'open' },
  render: (props, context) => (
    <OperatorWaitlistScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'search',
      title: 'Search',
      description:
        'A search for “sam” finds the two people who wait with it in their login or name. A user with app access, such as @tide-sam, is on the Users tab.',
      props: { list: 'search' },
    },
    {
      slug: 'approve',
      title: 'Approve a person',
      description:
        'Approve asks first. The question names the person and says that they get app access now, and that an email tells them. An approval is final, and the operator can still suspend the user later.',
      rationale:
        'An approval cannot be undone, and its email goes at once, so the question comes first. Approve works for one person at a time.',
      props: { dialog: 'approve' },
    },
    {
      slug: 'approved',
      title: 'After two approvals',
      description:
        'Each approved row keeps its place until the list loads again, with Approved and the state of its email. The email of @sam-okafor did not go yet, and the email of @jules-m went. The count above leaves them out.',
      rationale:
        'The approval saves its email and sends it at once. When a send fails, the app sends it again on its own, so the row states the fact calmly and offers no action. The page of the user shows the same state.',
      props: { list: 'approved' },
    },
    {
      slug: 'empty',
      title: 'Nobody is waiting',
      description:
        'With nobody on the waitlist, the tab says so and says where new people show. It has no search, because there is nothing to search.',
      props: { list: 'empty' },
    },
  ],
})
