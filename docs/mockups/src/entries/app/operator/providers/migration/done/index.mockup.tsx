import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../../screens/OperatorProvidersScreen'

export const operatorMigrationDone = defineScreen({
  title: 'Done',
  description:
    'The job finished on 26 November at 04:10. Its state is Done, and its facts give when it started and when it finished. Each account is Done, and each row shows its whole count. The job has no action. Failures and skips keeps the 6 steps that failed and the skips of each reason. It says that each of these machines gets the host program at its next start.',
  rationale:
    'The bootstrap covers each machine that the job skips or whose step fails, at its next start (own computer decision 7 D). So the box of a finished job is a record, and the operator needs no action on it. A later change of the host protocol runs the job again.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: {
    weights: 'default',
    accounts: 'both',
    signUps: 'open',
    job: 'done',
    pace: 'default',
  },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
