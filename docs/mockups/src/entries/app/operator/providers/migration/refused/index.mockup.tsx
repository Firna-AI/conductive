import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../../screens/OperatorProvidersScreen'

export const operatorMigrationRefused = defineScreen({
  title: 'Waiting after a refusal',
  description:
    'boat refused a start for its rate limit. The job waits on boat until 11:52, and its state is Waiting, because e2b is done. A line in amber says why, and that the job waits longer after each refusal. The starts that are left stay under it.',
  rationale:
    'The job waits longer after each refusal of a provider for its rate limit or its capacity (own computer decision 7 D). The state of the account gives the end of the wait as a time of day. So the operator can tell when the starts go on.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: {
    weights: 'default',
    accounts: 'both',
    signUps: 'open',
    job: 'refused',
    pace: 'default',
  },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'capacity',
      title: 'Refused for its capacity',
      description:
        'The same wait after boat refused a start for its capacity. The line in amber names the capacity in place of the rate limit.',
      rationale:
        'A refusal for the capacity of the account gets the same longer wait as a refusal for its rate limit.',
      props: { job: 'capacity' },
    },
  ],
})
