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

export const operatorMigrationOneOrg = defineScreen({
  title: 'Limit to one org',
  description:
    'Limit to one org opens a question over the running job, which is a sheet on a phone. The operator gives the ID of the org, as the page of the org shows it. The hint names the org that the ID finds: Hexwave, with 10 workspaces on boat. The question says that the job then works only on that org, and that the other orgs wait until Remove limit. Cancel leads back to the running job, and Limit job leads to the job limited to Hexwave.',
  rationale:
    'An operator can limit the job to one org (own computer decision 7 D), such as a test org first. An ID finds exactly one org, and the hint names it before the limit. So a typo does not limit the job to the wrong org.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: migrationProps(migrationPaths.limit),
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'limited',
      title: 'Limited to Hexwave',
      description:
        'The job works only on Hexwave, which has 5 steps left: brief starts of 4 stopped workspaces and the refresh of its org image. Orgs says Hexwave only. A line says that the other orgs wait until Remove limit, which takes the place of Limit to one org. The accounts keep the counts of the whole job.',
      rationale:
        'The counts of the whole job stay, so the operator still sees what is left after the limit. The line counts the work left in every row of Hexwave, restarts included. So it says that Hexwave is done only after its last step (review finding 4, 23 November 2026).',
      props: { job: migrationPages[migrationPaths.limited] },
    },
    {
      slug: 'limited-done',
      title: 'Hexwave done',
      description:
        'Each step of Hexwave ended, so the job waits. Its state is Waiting, and boat says Waiting for the limit. The line says that Hexwave is done, and that Remove limit goes on with every org. Remove limit leads to the running job.',
      rationale:
        'The job does not go on with the other orgs by itself, because the operator set the limit. The line names the one action that goes on.',
      props: { job: migrationPages[migrationPaths.limitedDone] },
    },
  ],
})
