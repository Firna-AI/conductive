import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const unavailableRoutine = defineScreen({
  title: 'Not available',
  description:
    'The page of a routine that Acme no longer has, because someone deleted it or the address is wrong. The page keeps Routine as its name, and it says that this routine is not available. Open Routines opens the list of the routines of Acme. The page has no tabs, no Runs list, and no actions.',
  rationale:
    'A deleted routine cannot come back, so the page offers only the way to the list. A read of the routine that finds no routine shows this page, also on a page that was open when someone deleted the routine elsewhere. The run workspaces of a deleted routine stay, because they are normal workspaces, from decision 504 A.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: { ...ownerRoutine, read: 'unavailable' },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
