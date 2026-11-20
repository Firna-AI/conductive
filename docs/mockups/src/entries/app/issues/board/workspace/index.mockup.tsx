import { defineScreen } from '@mokly/mokly'
import { BoardWorkspaceScreen } from '../../../../../screens/issues/BoardScreens'

export const issuesBoardWorkspace = defineScreen({
  title: 'D. The Issue tab of the right column',
  description:
    'The workspace of the card. The tools panel of the right column has an Issue tab before Terminal and Preview. It shows the issue with its state, checklist, and activity. The agent ticked the first item of the checklist as it worked. A phone shows the issue in place of the chat.',
  rationale:
    'The issue stays in view beside the chat, as the files and the terminal do. The agent writes its progress to the issue, so the board stays current.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-board'],
  render: (_props, context) => (
    <BoardWorkspaceScreen viewport={context.viewport} />
  ),
})
