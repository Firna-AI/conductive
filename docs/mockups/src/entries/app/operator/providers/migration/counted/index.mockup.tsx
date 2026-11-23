import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../../screens/OperatorProvidersScreen'

export const operatorMigrationCounted = defineScreen({
  title: 'Before the first start',
  description:
    'The job just after its count, on 23 November. It restarts the running machines of boat first, and 9 of 37 are done. boat expects 2,117 starts after the restarts: about 3 days at 30 starts in each hour. e2b expects 1 start, the refresh of the org image of Acme Labs, in less than an hour. Failures and skips says that nothing failed and nothing was skipped yet. Pause job and Limit to one org already work.',
  rationale:
    'Before its first start, the job counts the machines of each account by state and kind (own computer decision 7 D). It shows an operator the counts, the expected starts, and the expected days. The job does the running machines first, and each restart ends the running turns of its machine, as Restart does (own computer decision 8 A). A restart starts no machine, so the expected starts count only the brief starts and the refreshes. The time of the expected starts follows from the starts in each hour of the account.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: {
    weights: 'default',
    accounts: 'both',
    signUps: 'open',
    job: 'counted',
    pace: 'default',
  },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'counting',
      title: 'Counting',
      description:
        'The job right after the deploy, while it counts the machines of each account. A line says so in place of the accounts. The pace can change already, and Pause job and Limit to one org work.',
      rationale:
        'The count comes before the first start, so the box shows no account until the count ends. Nothing failed and nothing was skipped yet, so the box of the failures and the skips does not show.',
      props: { job: 'counting' },
    },
  ],
})
