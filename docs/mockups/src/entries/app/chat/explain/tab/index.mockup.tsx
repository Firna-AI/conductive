import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const explainTab = defineScreen({
  title: 'Expand',
  description:
    'Expand showed the tab of the explanation, at the end of the row, after Address autocomplete. The tab shows the whole chat, with the written prompt as its first message: the line that names the quote, the message ID and the session chip of Address autocomplete, the quote with the lines around it, and the instruction to the agent. So the tab hides nothing that the popover leaves out. On a phone the tab shows at the end of the session tabs.',
  rationale:
    'An explanation is a normal session, so its tab closes, moves, and renames as each session tab does, and its tab menu has the same items. The title of the session is the first line of the written prompt, cut at 60 characters on a whole word. The user chose A of what the agent knows on 17 November 2026: the prompt gives the quote and a link to the parent session, and the agent reads the parent with `read_session` when it needs more. The parent chat keeps the mark, which shows the popover again.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    tab: 'explanation',
    conversation: 'explanation',
    explainMarks: 'asked',
    explainSession: 'answered',
  },
  useCasePaths: ['user-flows/explain-chat-text'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
