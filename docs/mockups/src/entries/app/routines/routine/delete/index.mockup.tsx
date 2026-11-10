import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const deleteRoutine = defineScreen({
  title: 'Delete a routine',
  description:
    'Cal pressed Delete on his routine that reviews pull requests. A question asks first: its triggers and prompt are deleted, and its run workspaces stay. Cancel keeps the routine, and Delete routine deletes it and opens the Routines list. A phone asks in a sheet, after Delete routine at the end of the form.',
  rationale:
    'A deleted routine cannot come back, so Delete asks first, as Delete org does. An admin who is not the owner gets the same question. A deleted routine keeps its run workspaces, because they are normal workspaces, as the user chose in decision 204 A.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, dialog: 'delete' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
