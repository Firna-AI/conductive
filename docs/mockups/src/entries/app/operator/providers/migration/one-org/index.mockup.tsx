import { defineScreen } from '@mokly/mokly'
import {
  OperatorProvidersScreen,
  operatorProvidersSchema,
} from '../../../../../../screens/OperatorProvidersScreen'

export const operatorMigrationOneOrg = defineScreen({
  title: 'Limit to one org',
  description:
    'Limit to one org opens a question over the running job, which is a sheet on a phone. The operator gives the ID of the org, as the page of the org shows it. The hint names the org that the ID finds: Hexwave, with 10 workspaces on boat. The question says that the job then works only on that org, and that the other orgs wait until Remove limit. Cancel keeps every org.',
  rationale:
    'An operator can limit the job to one org (own computer decision 7 D), such as a test org first. An ID finds exactly one org, and the hint names it before the limit. So a typo does not limit the job to the wrong org.',
  relatedDocs: [],
  propSchema: operatorProvidersSchema,
  props: {
    weights: 'default',
    accounts: 'both',
    signUps: 'open',
    job: 'limit',
    pace: 'default',
  },
  render: (props, context) => (
    <OperatorProvidersScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'limited',
      title: 'Limited to Hexwave',
      description:
        'The job works only on Hexwave, and 3 of its 8 starts are done. Orgs says Hexwave only. A line says that the other orgs wait until Remove limit, which takes the place of Limit to one org. The accounts keep the counts of the whole job.',
      rationale:
        'The counts of the whole job stay, so the operator still sees what is left after the limit. The line gives the progress of the one org.',
      props: { job: 'limited' },
    },
    {
      slug: 'limited-done',
      title: 'Hexwave done',
      description:
        'The 8 starts of Hexwave are done, so the job waits. Its state is Waiting, and boat says Waiting for the limit. The line says that Hexwave is done, and that Remove limit goes on with every org.',
      rationale:
        'The job does not go on with the other orgs by itself, because the operator set the limit. The line names the one action that goes on.',
      props: { job: 'limited-done' },
    },
  ],
})
