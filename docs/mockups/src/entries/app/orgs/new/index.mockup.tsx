import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../../screens/CreateOrgScreen'

export const createOrg = defineScreen({
  title: 'Create org',
  description:
    'Create org beside the orgs that the user has: the name, the initials, and the repositories of Acme Labs, chosen from those that the GitHub App can reach. A person who is not an operator sees no provider account. The child pages have the first org of Get started, the first org with no repository chosen or reachable, and Create org of an operator, with the account choice.',
  rationale:
    'The page stands alone, without the rail, because the new org has nothing to show yet. Every org shares GitHub and the agents, as the user chose in decision 21, so the page asks only for what the org owns. The product is free for now, as the user chose in decision 45, so any user creates orgs. The cloud computer of the new org holds the chosen repositories. The user chose option E of decision 151 on 9 November 2026: Create org needs at least one repository, so every new org starts its first build at create. The hint says so before the user tries. Its saved states moved into their own folders with the same paths, so that this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'another', repositories: 'chosen', account: 'hidden' },
  useCasePaths: ['user-flows/create-org'],
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
})
