import { defineScreen } from '@mokly/mokly'
import { IssueBoardScreen } from '../../../../../screens/issues/BoardScreens'

export const issuesBoardLive = defineScreen({
  title: 'D. The board after the drop',
  description:
    'The board after the drop: the postcode card is in In progress, and its workspace mark runs, with Working in words. The card opens the workspace.',
  rationale:
    'The card and the workspace row show the same live mark, so the two views agree.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/issue-board'],
  render: (_props, context) => (
    <IssueBoardScreen viewport={context.viewport} stage="live" />
  ),
})
