import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedBuildFailed = defineScreen({
  title: 'First build failed',
  description:
    'The first build of Firna failed, and Claude is connected. The org step shows the message that the app saved for the build, with Try again and a link to its log on the Cloud computer tab. Open Firna stays on, and the words beside it say that the cloud computer did not build, not that Firna is ready.',
  rationale:
    'The user chose option C of decision 150 on 8 November 2026: the org step shows a failed first build with Try again, and only an admin gets Try again. The person who created the org is its admin. A failed build gets no automatic retry, as decision 12 says. The saved message asks the user to check the log, and the log is on the Cloud computer tab, so the step links to it.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: {
    ...getStartedFirstRun,
    step: 'done',
    agent: 'connected',
    firstBuild: 'failed',
  },
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})
