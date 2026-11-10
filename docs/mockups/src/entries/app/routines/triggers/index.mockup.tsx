import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../screens/routineState'

export const triggers = defineScreen({
  title: 'Add trigger',
  description:
    'Cal names a new routine Morning summary and writes its prompt. Add trigger opens one menu with two groups: Scheduled, with Hourly, Daily, Weekdays, Weekly, and Custom (cron), and GitHub, with PR opened, PR pushed, and PR merged. A phone shows the menu in a sheet.',
  rationale:
    'The triggers are the eight of the Conductor menu, and Run now starts a routine with a schedule, or with no trigger, at any time. Neither @firna/ui nor the menu of the app has submenus, so the two groups become labels in one flat menu. The child pages draw the editors of the schedules and of the author filter. This page has child pages, so it shows only its canonical screen.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: {
    ...ownerRoutine,
    routine: 'morning-draft',
    triggers: 'menu',
    runs: 'none',
  },
  useCasePaths: ['user-flows/create-routine'],
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
})
