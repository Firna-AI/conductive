import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../../screens/OperatorProvidersScreen'
import {
  migrationPages,
  migrationProps,
} from '../../../../../../screens/migrationPages'
import { migrationPaths } from '../../../../../../paths'

export const operatorMigrationPace = defineScreen({
  title: 'Pace changed',
  description:
    'The operator typed 60 starts in each hour and 6 at once for boat, and has not saved them. Save pace is on. The job still runs at the saved pace, so boat still has about 2 days left.',
  rationale:
    'The job paces its starts on each account by two operator settings, with a low default (own computer decision 7 D). They are the starts in each hour and the machines at once. Save pace acts at once with no question, as Save weights and Save stop time do. The box takes whole numbers in fields, because the app knows no limit of an account to offer choices from. Cal has not chosen yet which values an operator can save, so no field shows a refusal.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: migrationProps(migrationPaths.pace),
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'saved',
      title: 'Pace saved',
      description:
        'After Save pace, the fields keep the new pace of boat. A line under them says when and by which operator it changed, and Save pace is off again. boat now has about 20 hours left. Pause job leads to the paused job with this pace.',
      rationale:
        'The line of the last change follows the boxes of the weights and the stop time, so an operator can tell who set the pace. Cal has not chosen yet whether the app records each change of the pace. This page draws the recommendation: the app records it, and the line shows it.',
      props: { job: migrationPages[migrationPaths.paceSaved] },
    },
    {
      slug: 'not-saved',
      title: 'Pace not saved',
      description:
        'The save failed. The fields keep the typed pace, a line in red says that the pace was not saved, and Save pace stays on to try again. The job keeps the saved pace.',
      rationale:
        'A failed save keeps the typed pace and says so, as a failed save of the weights does.',
      props: { job: migrationPages[migrationPaths.paceNotSaved] },
    },
  ],
})
