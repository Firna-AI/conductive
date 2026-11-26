import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../screens/OperatorProvidersScreen'

export const operatorProviders = defineScreen({
  title: 'Providers',
  description:
    'The Providers tab sets the weights that give each new org its provider account, with one slider between boat and e2b. Each end names its account by its ID and gives its share, and the two shares add up to 100%. The default gives boat 100%. Save weights stays off until the slider moves. Under the weights, Orgs by account counts the orgs on each account, deleted orgs included, so the counts add up to the orgs of the Overview. Here 1 org runs on e2b: Acme Labs, the test org that the operator created there. The child pages have the weights moved, saved, and not saved, one account, and three accounts with a field for each.',
  rationale:
    'The user chose option G of e2b decision 222 on 10 November 2026: a new org gets its account by chance, from weights that the operator sets with a slider in the operator section. Existing orgs stay on boat, and a change of the weights moves no org, so the counts show where the orgs run. An e2b decision is a decision of the change that adds E2B as the second sandbox provider. On 20 November 2026 the user asked that an operator can switch an org to another account, on the page of the org, so the line of the weights says so. Option A of e2b decision 221 shows the account IDs on operator screens, and no screen for other people names a provider. The tab joins the end of the tabs, so the other tabs keep their places. Its saved states moved into their own folders with the same paths, so that this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: { weights: 'default', accounts: 'both', signUps: 'open' },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
