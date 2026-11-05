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
    'The page stands alone, without the rail, because the new org has nothing to show yet. Every org shares GitHub and the agents, so the page asks only for what the org owns, as the user chose in decision 21. The cloud computer of the new org holds the chosen repositories. Get started is the only first run, so a person without the GitHub App installs it there before this page.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { first: false },
  useCasePaths: ['user-flows/create-org'],
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'first',
      title: 'First org',
      description:
        'The first org of a new user, from the last step of Get started. Cancel returns to Get started, because the user has no org to go back to.',
      props: { first: true },
      useCasePaths: ['user-flows/sign-up'],
    },
  ],
})
