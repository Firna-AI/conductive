import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedConnected = defineScreen({
  title: 'Agent connected, cloud computer ready',
  description:
    'The first build of Firna succeeded, and Claude is connected with a subscription token, so every step is done. The org step shows the cloud computer ready, and Open Firna leads to the new org.',
  rationale:
    'The finish says that Firna is ready for a new workspace only after its first build succeeded, as the user chose in option C of decision 142. Moved here from a saved state of the Get started page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: {
    ...getStartedFirstRun,
    step: 'done',
    agent: 'connected',
    firstBuild: 'succeeded',
  },
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})
