import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const memberRoutine = defineScreen({
  title: 'Seen by a member',
  description:
    "Priya, a member who is not an admin, reads Cal's routine: its facts, its triggers, its prompt with the model, and its runs, without fields and without actions. One line says that only Cal can change it.",
  rationale:
    'Every member sees each routine, its prompt, and its runs, as the user chose in decision 202 B. A run acts as its owner, so only the owner decides what runs on those logins.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, viewer: 'member' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
