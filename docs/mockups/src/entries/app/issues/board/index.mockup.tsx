import { defineScreen } from '@mokly/mokly'
import { IssueBoardScreen } from '../../../../screens/issues/BoardScreens'

export const issuesBoard = defineScreen({
  title: 'D. Board',
  description:
    'Variation D. The Issues page is a board, with one column for each state. Each card shows its label, its priority, its title, the live marks of its workspaces with the state of the first one in words, and its assignee. Cards in In progress and In review show what their agents do now.',
  rationale:
    'The board is also the view of the agents of the org. A person sees which issue waits for input or has failed checks, without the workspace list.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-board'],
  render: (_props, context) => (
    <IssueBoardScreen viewport={context.viewport} stage="board" />
  ),
})
