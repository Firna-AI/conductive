import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedNoOrg = defineScreen({
  title: 'No org, agent connected',
  description:
    'Priya left Acme, the last org, in app/orgs/suspended/leave/confirm. Claude is still connected, because a login belongs to the person. Create org is the next step, and the rail shows no org.',
  rationale:
    'The words name the steps that remain. They make no claim about earlier use, so they hold for a new person and for a person who returns with no org. Moved here from a saved state of the Get started page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: {
    ...getStartedFirstRun,
    step: 'org',
    agent: 'connected',
    person: 'priya',
  },
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})
