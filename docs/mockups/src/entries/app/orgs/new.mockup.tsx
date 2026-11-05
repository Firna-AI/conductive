import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../screens/CreateOrgScreen'

export const createOrg = defineScreen({
  title: 'Create org',
  description:
    'The name, the initials, and the repositories that the workspaces of the new org use, chosen from those that the GitHub App can reach.',
  rationale:
    'The page stands alone, without the rail, because the new org has nothing to show yet. Every org shares GitHub and the agents, so the page asks only for what the org owns. Waits on decision 21, drawn as its recommended option A. The cloud computer of the new org holds the chosen repositories.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { connections: 'connected' },
  useCasePaths: ['user-flows/create-org'],
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'not-connected',
      title: 'Not connected yet',
      description:
        'The first run: GitHub is not connected yet, so the page cannot list repositories. A notice leads to the account, where the user connects GitHub and signs in to the agents.',
      props: { connections: 'not-connected' },
    },
  ],
})
