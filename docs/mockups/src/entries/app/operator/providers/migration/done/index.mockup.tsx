import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../../screens/OperatorProvidersScreen'
import { migrationProps } from '../../../../../../screens/migrationPages'
import { migrationPaths } from '../../../../../../paths'

export const operatorMigrationDone = defineScreen({
  title: 'Done',
  description:
    'The job finished on 26 November at 04:10. Its state is Done, and its facts give when it started and when it finished. Each account is Done, and each row shows its whole count. The job has no action. The Pace box shows the saved pace of each account as text, with no field and no Save pace. Failures and skips keeps the 6 steps that failed with their causes, and the skips of each reason. It says that each of these machines gets the host program at its next start.',
  rationale:
    'The bootstrap covers each machine that the job skips or whose step fails, at its next start (own computer decision 7 D). So the boxes of a finished job are a record, and the operator needs no action on them. The Pace box reads the saved pace only, and it offers no edit (review finding 5, 23 November 2026). A later change of the host protocol runs the job again.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: migrationProps(migrationPaths.done),
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
})
