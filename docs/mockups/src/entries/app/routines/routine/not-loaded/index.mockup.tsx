import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const notLoadedRoutine = defineScreen({
  title: 'Not loaded',
  description:
    'The read of the routine failed, here because the app could not reach the server. The page keeps Routine as its name. The notice names what failed and gives the message of the server, and Try again reads the routine again. The page has no tabs, no Runs list, and no actions.',
  rationale:
    'The page uses the load failure of the other lists of the app. A read that fails while the routine already shows keeps the routine on the page, so a short network problem does not take away an edit that is not saved.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, read: 'failed' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
