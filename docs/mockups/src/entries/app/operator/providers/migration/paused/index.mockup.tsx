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

export const operatorMigrationPaused = defineScreen({
  title: 'Paused',
  description:
    '@calummoore paused the job on 24 November at 11:42, from Pause job. Its state is Paused, and its facts give the time and the operator of the pause. Each account that has work left shows Paused, with the starts that are left. Continue job takes the place of Pause job and leads back to the running job. Limit to one org opens its question over the paused job. The variants show a pause that keeps a limit, the question over the paused job, and a pause that keeps a saved pace.',
  rationale:
    'An operator can pause and continue the job (own computer decision 7 D). Pause job and Continue job ask no question, because each one undoes the other at once. The facts name the operator of the pause, so another operator knows whom to ask. Cal has not chosen yet what the box shows while steps of the job still run after a pause. This page draws the smallest choice: the box shows Paused at once.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: migrationProps(migrationPaths.paused),
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'limited',
      title: 'Paused with a limit',
      description:
        'A pause of the job limited to Hexwave. Orgs says Hexwave only, and the line still gives the 5 steps that Hexwave has left. Continue job leads to the job limited to Hexwave. Remove limit leads to the paused job on every org.',
      rationale:
        'Pause job changes only the run of the job, so the pause keeps the limit. Remove limit changes only the limit, so the job stays paused (review finding 1, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.pausedLimited] },
    },
    {
      slug: 'limit-question',
      title: 'Limit question over a pause',
      description:
        'Limit to one org on the paused job opens the same question over it. Cancel leads back to the paused job. Limit job leads to the paused job limited to Hexwave.',
      rationale:
        'The question changes only the limit of the job, so Cancel and Limit job keep the pause (review finding 1, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.pausedLimit] },
    },
    {
      slug: 'saved-pace',
      title: 'Paused with a saved pace',
      description:
        'A pause of the job after Save pace. The Pace box keeps the saved pace of boat, 60 starts in each hour and 6 at once, with the line of its change. Continue job leads to the running job with that pace.',
      rationale:
        'Pause job changes only the run of the job, so the saved pace stays (review finding 1, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.pausedPace] },
    },
  ],
})
