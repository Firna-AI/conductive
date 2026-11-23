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

export const operatorMigrationCounted = defineScreen({
  title: 'Before the first start',
  description:
    'The job just after its count, on 23 November. It restarts the running machines of boat first: 9 of 37 are done, and 3 run. boat expects 2,117 starts after the restarts: about 3 days at 30 starts in each hour. e2b refreshes the org image of Acme Labs, its 1 expected start, in less than an hour. Failures and skips says that nothing failed and nothing was skipped yet. Pause job and Limit to one org work here, and they have no link. The variants show the count itself, the limit question, the limit, and a pause during the count.',
  rationale:
    'Before its first start, the job counts the machines of each account by state and kind (own computer decision 7 D). It shows an operator the counts, the expected starts, and the expected days. The job does the running machines first, and each restart ends the running turns of its machine, as Restart does (own computer decision 8 A). A restart starts no machine, so the expected starts count only the brief starts and the refreshes. After Pause job, the job starts no new step, and each running step goes on to its end. While steps still run, the box shows Pausing with the count of running steps. When none runs, it shows Paused (agent call of 23 November 2026). Here 4 steps run, and the catalogue draws no Pausing and no limit question at this moment. So Pause job and Limit to one org have no link here. The variants draw both during the count.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: migrationProps(migrationPaths.counted),
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'counting',
      title: 'Counting',
      description:
        'The job right after the deploy, on 23 November at 06:03, while it counts the machines of each account. A line says so in place of the accounts. The pace can change already. Limit to one org opens its question over the count. Pause job leads to the paused count.',
      rationale:
        'The count comes before the first start, so the box shows no account until the count ends. Nothing failed and nothing was skipped yet, so the box of the failures and the skips does not show. The design calls of the plan let an operator pause the job and limit it while it counts.',
      props: { job: migrationPages[migrationPaths.counting] },
    },
    {
      slug: 'counting-limit',
      title: 'Limit question during the count',
      description:
        'Limit to one org during the count opens the same question over the job that counts. Cancel leads back to the count. Limit job leads to the count with the limit to Hexwave.',
      rationale:
        'The question changes only the limit of the job, so Cancel and Limit job keep the count (review finding 1, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.countingLimit] },
    },
    {
      slug: 'counting-limited',
      title: 'Limited during the count',
      description:
        'The count, with the limit to Hexwave. Orgs says Hexwave only. The line says that after the count, the job works only on Hexwave, because the count has no rows of Hexwave yet. The line of the count stays in place of the accounts. Remove limit leads back to the count. Pause job has no link, because the catalogue draws no pause of a limited count.',
      rationale:
        'While the job counts, the limit has no rows. Its line names the org with no progress, as the design calls of the plan say. A limit changes no fact, so the count stays as it was.',
      props: { job: migrationPages[migrationPaths.countingLimited] },
    },
    {
      slug: 'counting-paused',
      title: 'Paused during the count',
      description:
        'Pause job during the count. The count starts no machine, so no step runs, and the box shows Paused at once, with the time and the operator of the pause. The line of the count stays in place of the accounts, because the count has not ended. Continue job leads back to the count. Limit to one org has no link here.',
      rationale:
        'After Pause job, the job starts no new step, and each running step goes on to its end. While steps still run, the box shows Pausing with the count of running steps. When none runs, it shows Paused (agent call of 23 November 2026). No step runs during the count, so the box shows Paused at once. The job shows the line of its count in each state until the count ends (review of round 2, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.countingPaused] },
    },
  ],
})
