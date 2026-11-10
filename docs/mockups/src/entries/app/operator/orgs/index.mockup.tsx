import { defineScreen } from '@mokly/mokly'
import {
  OperatorOrgsScreen,
  operatorOrgsSchema,
} from '../../../../screens/OperatorOrgsScreen'

export const operatorOrgs = defineScreen({
  title: 'Orgs',
  description:
    'The Orgs tab lists every org, newest first, 20 at a time with Show more. Each row gives the creation day, the provider account of the org by its ID, the members, the workspaces, the running cloud computers, and the state of a suspended or deleted org. A phone has no Account column, so a second line under the name says which account the org runs on. The newest org, Acme Labs, is the test org that the operator created on e2b. Each name opens the page of the org. The search finds an org by name, by org ID, by the ID of a cloud computer, or by a preview address.',
  rationale:
    'The user asked on 8 November 2026 that the operator can search orgs and open a page for each, in decision 147. An abuse report names a cloud computer or a preview address, not an org, so the search takes those too. The list shows counts and names only. The user chose option G of e2b decision 222 on 10 November 2026: each org runs on one provider account for its whole life, and the Orgs tab shows it. An e2b decision is a decision of the change that adds E2B as the second sandbox provider. Option A of e2b decision 221 shows the account IDs on operator screens.',
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
