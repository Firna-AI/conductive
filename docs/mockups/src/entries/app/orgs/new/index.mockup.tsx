import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../../screens/CreateOrgScreen'

export const createOrg = defineScreen({
  title: 'Create org',
  description:
    'Create org beside the orgs that the user has: the name, the initials, and the repositories of Acme Labs, chosen from those that the GitHub App can reach.',
  rationale:
    'The page stands alone, without the rail, because the new org has nothing to show yet. Every org shares GitHub and the agents, as the user chose in decision 21, so the page asks only for what the org owns. The product is free for now, as the user chose in decision 45, so any user creates orgs. The cloud computer of the new org holds the chosen repositories.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'another' },
  useCasePaths: ['user-flows/create-org'],
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'first',
      title: 'First org',
      description:
        'The first org of a new user, from the second step of Get started. Create org and Cancel both return to Get started, because the user has no org to go back to. The next step adds the Boat key of the new org.',
      props: { kind: 'first' },
      useCasePaths: ['user-flows/sign-up'],
    },
  ],
})
