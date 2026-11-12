import { defineScreen } from '@mokly/mokly'
import {
  CreateOrgScreen,
  createOrgSchema,
} from '../../../../../screens/CreateOrgScreen'

export const createOrgOperator = defineScreen({
  title: 'Create org as an operator',
  description:
    'Create org for an operator, the person who runs Conductive for everyone. Under the repositories, Provider account chooses the account that the new org runs on: By weights, the default, leaves it to the weights of the Providers tab, and boat and e2b name an account by its ID. The hint says that only operators see the choice, and that the org keeps its account for its whole life. Create org in the rail and in the org switcher of an operator opens this page. The saved states have e2b chosen for a test org, and the first org of an operator in Get started.',
  rationale:
    'The user chose on 10 November 2026, with option G of e2b decision 222, that an operator chooses the account of an org when the operator creates it, so that a test org can run on each provider. Only operators see the choice, and the Worker ignores it from anyone else, so no other person learns of a provider. An e2b decision is a decision of the change that adds E2B as the second sandbox provider. Option A of e2b decision 221 shows the account IDs on operator screens. By weights is the default, so an operator who leaves it gets the same draw as everyone else. The choice lists only the accounts that the settings of the Worker hold.',
  relatedDocs: [],
  propSchema: createOrgSchema,
  props: { kind: 'another', repositories: 'chosen', account: 'weights' },
  render: (props, context) => (
    <CreateOrgScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'e2b',
      title: 'e2b chosen',
      description:
        'The operator chooses e2b for Acme Labs, a test org. Create org makes Acme Labs on e2b, and the Orgs tab of the operator then lists it there.',
      props: { account: 'e2b' },
    },
    {
      slug: 'first',
      title: 'First org of an operator',
      description:
        'The first org of an operator, from the second step of Get started, with the same choice under the repositories. Create org and Cancel both return to Get started.',
      rationale:
        'An operator gets app access as an operator, so the first org of an operator also comes from Get started, and the choice shows there too.',
      props: { kind: 'first', account: 'weights' },
    },
  ],
})
