import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../../screens/CreateOrgScreen'

export const createOrg = defineScreen({
  title: 'Create org',
  description:
    'Create org of a person who already owns a free org: the name, the initials, and the repositories of Acme Labs, then Team, with the price for its 1 member, the pool, the price of more use, and the tax. Continue to payment hands off to Stripe Checkout, and the new org opens after the payment.',
  rationale:
    'Each free account gets one org, from decision 25, and Cal already owns Firna on Free. So each new org of Cal starts on Team, and the page shows the plan before the payment, as an agent call of 5 November 2026 says. The page stands alone, without the rail, because the new org has nothing to show yet. Every org shares GitHub and the agents, as the user chose in decision 21, so the page asks only for what the org owns.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'team' },
  useCasePaths: ['user-flows/create-org'],
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'first',
      title: 'First org',
      description:
        'The first org of a new user, from the last step of Get started, which is the free org. Create org makes it at once, and Cancel returns to Get started, because the user has no org to go back to.',
      props: { kind: 'first' },
      useCasePaths: ['user-flows/sign-up'],
    },
  ],
})
