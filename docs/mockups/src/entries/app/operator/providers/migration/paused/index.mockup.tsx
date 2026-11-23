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
    'The job after Pausing. By 24 November at 11:58, the 3 steps that ran at the pause ended, and no step runs. So the job and boat show Paused. The facts give the time and the operator of the pause, 11:46. boat has 1,226 starts left, because the 3 brief starts that ran count as handled. Continue job has no link, because the catalogue draws no running job of this later time. Limit to one org opens its question over the paused job. The variants show a pause that keeps a limit, the question over the paused job, and a pause that keeps a saved pace.',
  rationale:
    'After Pause job, the job starts no new step, and each running step goes on to its end. While steps still run, the box shows Pausing with the count of running steps. When none runs, it shows Paused (agent call of 23 November 2026). The steps that ended during Pausing stay done, so they never go back to the queue (review finding 8, 23 November 2026). The facts name the operator of the pause, so another operator knows whom to ask.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: migrationProps(migrationPaths.paused),
  useCasePaths: ['user-flows/pause-the-migration-job'],
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'limited',
      title: 'Paused with a limit',
      description:
        'The job limited to Hexwave after Pausing. Orgs says Hexwave only. Hexwave still has 5 steps left, because the 3 steps that ran at the pause were not of Hexwave. Remove limit leads to the paused job on every org. Continue job has no link.',
      rationale:
        'Remove limit changes only the limit, so the job stays paused (review finding 1, 23 November 2026). A limit starts no step of another org, and the steps that run at the limit go on to their end, as at a pause.',
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
        'The job with the saved pace of boat after Pausing. The Pace box keeps that pace, 60 starts in each hour and 6 at once. The line of its change gives 11:46, the time of the pause. Continue job has no link.',
      rationale:
        'Pause job changes only the pause request, so the saved pace stays. The pause cannot show an earlier time than the save (review finding 7, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.pausedPace] },
    },
  ],
})
