import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const adminRoutine = defineScreen({
  title: 'Seen by an admin',
  description:
    "Cal, an admin, reads Priya's weekly routine, which uses a Codex model. Turn off and Delete are the only actions.",
  rationale:
    'An admin can turn a routine off and delete it, from decision 502 B, but cannot change it or turn it on, because its runs use the logins of its owner.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, routine: 'dependency-updates', runs: 'weekly' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
