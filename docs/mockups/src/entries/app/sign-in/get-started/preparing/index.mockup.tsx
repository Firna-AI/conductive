import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedPreparing = defineScreen({
  title: 'Agent connected, cloud computer preparing',
  description:
    'Claude is connected, so every step is done, and the first build of Firna still runs. The org step shows its time. Open Firna stays on, and the words beside it say that the cloud computer is still being prepared, not that Firna is ready.',
  rationale:
    'The user chose option C of decision 150 on 8 November 2026: the finish says that the org is ready only after a good build, and Open Firna stays on while the build runs. New workspace then shows the build and keeps Send off until it succeeds, as app/new-workspace/first-build shows.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: {
    ...getStartedFirstRun,
    step: 'done',
    agent: 'connected',
    firstBuild: 'running',
  },
  useCasePaths: ['user-flows/sign-up'],
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})
