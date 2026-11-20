import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const sideQuestionTab = defineScreen({
  title: 'Open as tab',
  description:
    'Open as tab showed the tab of the side session, at the end of the row, after Address autocomplete. Its chat is the chat of the overlay, and its first message links back to Address autocomplete with the session chip. On a phone the tab shows at the end of the session tabs.',
  rationale:
    'A side session is a normal session, so its tab closes, moves, and renames as each session tab does, and its tab menu has the same items. The parent chat keeps the mark, which opens the overlay again.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    tab: 'side-session',
    conversation: 'side-question',
    sideMarks: 'asked',
    sideSession: 'idle',
  },
  useCasePaths: ['user-flows/ask-a-side-question'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
