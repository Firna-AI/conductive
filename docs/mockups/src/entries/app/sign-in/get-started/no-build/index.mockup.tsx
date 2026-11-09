import { defineScreen } from '@mokly/mokly'
import {
  getStartedFirstRun,
  GetStartedScreen,
  getStartedSchema,
} from '../../../../../screens/GetStartedScreen'

export const getStartedNoBuild = defineScreen({
  title: 'No build',
  description:
    'Every step is done, and Firna has repositories but no build and no build that runs, such as after a first build that did not start. The org step says No build yet, with Build computer. Open Firna stays on, and the words beside it say that the cloud computer needs a build.',
  rationale:
    'When the first build cannot start, Create org still succeeds, and the finish needs words for that org. Build computer gives the person one way to recover, and the person who created the org is its admin. New workspace shows the same state, as app/new-workspace/first-build/no-build shows.',
  relatedDocs: [],
  propSchema: getStartedSchema,
  props: {
    ...getStartedFirstRun,
    step: 'done',
    agent: 'connected',
    firstBuild: 'none',
  },
  render: (props, context) => (
    <GetStartedScreen state={props} viewport={context.viewport} />
  ),
})
