import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgsScreen,
  operatorOrgsSchema,
} from '../../../../screens/OperatorOrgsScreen'

export const operatorOrgs = defineScreen({
  title: 'Orgs',
  description:
    'The Orgs tab lists every org, newest first, 20 at a time with Show more. Each row gives the creation day, the members, the workspaces, the running cloud computers, and the state of a suspended or deleted org. Each name opens the page of the org. The search finds an org by name, by org ID, by the ID of a cloud computer, or by a preview address.',
  rationale:
    'The user asked on 8 November 2026 that the operator can search orgs and open a page for each, in decision 147. An abuse report names a cloud computer or a preview address, not an org, so the search takes those too. The list shows counts and names only.',
  relatedDocs: [],
  propSchema: operatorOrgsSchema,
  props: { search: 'newest' },
  render: (props, context) => (
    <OperatorOrgsScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'search',
      title: 'Search by name',
      description:
        'A search for “north” finds the two orgs whose names hold it.',
      props: { search: 'name' },
    },
    {
      slug: 'lookup',
      title: 'Search by preview address',
      description:
        'A preview address from an abuse report finds the org of its workspace. The line under the name says what matched.',
      props: { search: 'preview' },
    },
    {
      slug: 'none',
      title: 'No match',
      description:
        'A search that finds no org says so, and the line above says what the search takes.',
      props: { search: 'none' },
    },
  ],
})
