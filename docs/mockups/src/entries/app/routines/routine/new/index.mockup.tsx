import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const newRoutine = defineScreen({
  title: 'New routine',
  description:
    'New routine opens an empty routine. Its name says Untitled routine, it is active, and it uses the first repository and the General section. It has no trigger yet, and the prompt asks what the routine should do. Save is the only action, and it stays off until the prompt has text. The Runs list says No runs yet, and a phone shows no tabs until the first save.',
  rationale:
    'An empty name saves as Untitled routine, as in Conductor. A routine can have no trigger, because Run now still starts it. A run without a prompt has no task, so Save stays off until the prompt has text, as the user chose in decision 211 B. Run now and Delete come after the first save.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, routine: 'new', runs: 'none' },
  useCasePaths: ['user-flows/create-routine'],
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
