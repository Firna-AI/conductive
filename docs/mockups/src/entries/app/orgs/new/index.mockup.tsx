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
    'The page stands alone, without the rail, because the new org has nothing to show yet. Every org shares GitHub and the agents, as the user chose in decision 21, so the page asks only for what the org owns. The product is free for now, as the user chose in decision 45, so any user creates orgs. The cloud computer of the new org holds the chosen repositories. The user chose option E of decision 143 on 9 November 2026: Create org needs at least one repository, so every new org starts its first build at create. The hint says so before the user tries.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'another', repositories: 'chosen' },
  useCasePaths: ['user-flows/create-org'],
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'first',
      title: 'First org',
      description:
        'The first org of a new user, from the second step of Get started. Create org and Cancel both return to Get started, because the user has no org to go back to. The next step connects Claude or Codex.',
      props: { kind: 'first' },
      useCasePaths: ['user-flows/sign-up'],
    },
    {
      slug: 'no-repository',
      title: 'First org, no repository chosen',
      description:
        'The first org of Get started has its name, and the GitHub App reaches the 3 repositories of firna, but none is chosen yet. Create org is off. The hint under Repositories says to add at least one.',
      rationale:
        'Option E of decision 143: Create org starts the first build, and a build needs a repository, so the org needs one at create. The hint states the rule in all states, so the page needs no error when the user tries.',
      props: { kind: 'first', repositories: 'none' },
    },
    {
      slug: 'no-access',
      title: 'First org, no repository reachable',
      description:
        'The first org of Get started has its name, but the GitHub App reaches no repository of the user, for example because the install chose none. The list says to give the GitHub App access to a repository, and Manage access opens the page of the GitHub App. Create org is off.',
      rationale:
        'Option E of decision 143 adds this rejection: a user whose GitHub App reaches no repository cannot create an org until it reaches one. The empty list uses the words and the action of the app, so the page adds no new words.',
      props: { kind: 'first', repositories: 'unreachable' },
    },
  ],
})
