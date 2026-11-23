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

export const operatorMigrationPausing = defineScreen({
  title: 'Pausing',
  description:
    '@calummoore pressed Pause job on the running job, on 24 November at 11:46. The job starts no new step, and the 3 brief starts that run on boat go on to their end. So the job and boat show Pausing with the 3 running steps, and a line says what Pausing means. The facts give the time and the operator of the pause, as Pause asked. Continue job takes the place of Pause job and leads back to the running job. When no step runs, the job shows Paused, as the paused page shows. The variants show a pause that keeps a limit, a saved pace, or a wait after a refusal.',
  rationale:
    'After Pause job, the job starts no new step, and each running step goes on to its end. While steps still run, the box shows Pausing with the count of running steps. When none runs, it shows Paused (agent call of 23 November 2026). An operator can pause and continue the job (own computer decision 7 D). Pause job changes only the pause request. So this page keeps the time, the work, and the running steps of the running job (review findings 7 and 8, 23 November 2026). Limit to one org has no link here, because the catalogue draws no limit question while the job pauses.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: migrationProps(migrationPaths.pausing),
  useCasePaths: ['user-flows/pause-the-migration-job'],
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'limited',
      title: 'Pausing with a limit',
      description:
        'Pause job on the job limited to Hexwave. Orgs says Hexwave only, and the line still gives the 5 steps that Hexwave has left. boat shows Pausing with its 3 running steps. Continue job leads back to the job limited to Hexwave. Remove limit leads to Pausing on every org.',
      rationale:
        'Pause job changes only the pause request, so the pause keeps the limit. Remove limit changes only the limit, so the job keeps pausing (review finding 7, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.pausingLimited] },
    },
    {
      slug: 'saved-pace',
      title: 'Pausing with a saved pace',
      description:
        'Pause job right after Save pace. The Pace box keeps the saved pace of boat, with the line of its change. The pause and the save have the same time, 24 November at 11:46, because each action takes the time of its page. Continue job leads back to the job with the saved pace.',
      rationale:
        'A control keeps the facts of its page. So a pause after Save pace cannot show an earlier time than the save (review finding 7, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.pausingPace] },
    },
    {
      slug: 'rate-limit',
      title: 'Pausing during a wait',
      description:
        'Pause job while boat waits after a refusal for its rate limit. boat shows Pausing with its 2 running steps, and the line in amber still says why boat waits. Continue job leads back to the wait until 11:52.',
      rationale:
        'A pause keeps the wait after a refusal, because the wait is a fact of the page, and no control changes a fact. The job waits longer after each refusal (own computer decision 7 D).',
      props: { job: migrationPages[migrationPaths.pausingRateLimit] },
    },
    {
      slug: 'capacity',
      title: 'Pausing during a capacity wait',
      description:
        'The same pause while boat waits after a refusal for its capacity. The line in amber names the capacity. Continue job leads back to that wait.',
      rationale:
        'A refusal for the capacity of the account keeps its wait during a pause, as a refusal for its rate limit does.',
      props: { job: migrationPages[migrationPaths.pausingCapacity] },
    },
  ],
})
