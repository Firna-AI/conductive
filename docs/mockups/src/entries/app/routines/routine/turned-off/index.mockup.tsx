import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const turnedOffRoutine = defineScreen({
  title: 'Turned off after failed runs',
  description:
    "Cal's hourly routine Triage new errors, after its last three runs failed because Cal's Claude login is not connected. The routine is off, and a notice says why and what to do. The Runs list shows the three failed runs at the top, each with its cause and Connect Claude. Cal can fix the login, turn the routine on, use Run now, or delete it.",
  rationale:
    'The user chose option B of decision 513 on 9 November 2026: a routine turns off after three runs in a row fail. A failed check, a failed start, and a failed first turn each count, and a finished first turn resets the count. Only the owner turns the routine on again. The check of the agent login failed these runs before the create, so they have no workspace, and each row shows its cause and a link that fixes it, from decision 512 B.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, routine: 'error-triage', runs: 'turned-off' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
