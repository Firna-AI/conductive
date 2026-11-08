import { defineScreen } from '@mokly/mokly'
import {
  OperatorUsersScreen,
  operatorUsersSchema,
} from '../../../../screens/OperatorUsersScreen'

export const operatorUsers = defineScreen({
  title: 'Users',
  description:
    'The Users tab lists every user, newest first, 20 at a time with Show more. Each row gives the join day, the orgs, the workspaces that the user owns, and the state of a suspended user. Each login opens the page of the user. The search finds a user by GitHub login, name, or numeric GitHub ID.',
  rationale:
    'The user asked on 8 November 2026 that the operator can search users and open a page for each, in decision 147. The list shows no email address, so that the section holds the least personal data.',
  relatedDocs: [],
  propSchema: operatorUsersSchema,
  props: { search: 'newest' },
  render: (props, context) => (
    <OperatorUsersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'search',
      title: 'Search',
      description: 'A search for “dan” finds two users by login and name.',
      props: { search: 'name' },
    },
    {
      slug: 'none',
      title: 'No match',
      description:
        'A search that finds no user says so, and the line above says what the search takes.',
      props: { search: 'none' },
    },
  ],
})
