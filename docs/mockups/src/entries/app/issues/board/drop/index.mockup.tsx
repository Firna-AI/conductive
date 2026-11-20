import { defineScreen } from '@mokly/mokly'
import { IssueBoardScreen } from '../../../../../screens/issues/BoardScreens'

export const issuesBoardDrop = defineScreen({
  title: 'D. Drop to start',
  description:
    'The postcode card hovers over In progress. The column shows its outline and says Drop to start a workspace. The drop starts the workspace at once, with the repository of the issue and the default model of the person, and with no dialog.',
  rationale:
    'A move to In progress means that work starts, so the move starts it. A person who wants another model or a note uses Start workspace on the issue instead.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-board'],
  render: (_props, context) => (
    <IssueBoardScreen viewport={context.viewport} stage="drop" />
  ),
})
