import { defineScreen } from '@mokly/mokly'
import { RoutineScreen } from '../../../../../screens/RoutineScreen'
import {
  ownerRoutine,
  routineStateSchema,
} from '../../../../../screens/routineState'

export const schedules = defineScreen({
  title: 'Schedules',
  description:
    'Hourly asks for the minute of each hour. The time zone of the routine shows under the triggers, and the owner can change it.',
  rationale:
    'The user chose option B of decision 503: a schedule runs at most once an hour, so Hourly is the most frequent preset. @firna/ui has no time input, so a time is a select for the hour and one for the minute. Each routine has one time zone, so that "Daily at 09:00" means 09:00 for its owner, and a custom cron uses it too.',
  relatedDocs: [],
  propSchema: routineStateSchema,
  props: {
    ...ownerRoutine,
    routine: 'morning-summary',
    triggers: 'hourly',
    runs: 'none',
  },
  render: (props, context) => (
    <RoutineScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'daily',
      title: 'Daily',
      description:
        'Daily asks for a time on the 24-hour clock. Weekdays asks for a time in the same way, as the saved routine of the flow shows in app/routines/runs/saved.',
      props: { triggers: 'daily' },
    },
    {
      slug: 'weekly',
      title: 'Weekly',
      description: 'Weekly asks for a day and a time.',
      props: { triggers: 'weekly' },
    },
    {
      slug: 'custom-refused',
      title: 'Custom cron refused',
      description:
        'A custom cron that runs every 15 minutes in working hours. The form refuses it and says why under the field. Save stays off until the first field names one minute.',
      rationale:
        'The user chose option B of decision 503 on 8 November 2026, and kept it on 9 November 2026. A custom cron needs five fields, and its minute field must name one minute, so one frequent routine cannot use up the daily starts of every org.',
      props: { triggers: 'custom-refused' },
    },
  ],
})
