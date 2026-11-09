import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../../screens/routineState'

export const suspendedRoutine = defineScreen({
  title: 'Routine of a suspended org',
  description:
    "Cal's routine that reviews pull requests, after the operator suspended Acme. The notice of the org is at the top. The facts, the triggers, and the prompt show without fields, and the page has no Save, Run now, Delete, Turn off, or Add trigger. The runs show the stop of the suspension, and the run that waited in the queue shows as skipped, because Acme is suspended. A phone shows the Routine and Runs tabs.",
  rationale:
    'Nothing in a suspended org can change, also for the owner or an admin, so every person reads the routine. The notice says why, so the page does not say that only the owner can change it. No line names the logins of runs, because a suspended org starts no run.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, org: 'suspended', runs: 'suspended' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
