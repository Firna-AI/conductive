import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { explainWaitsWalk } from '../../../../../screens/tabWalks'
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
  variants: [
    {
      slug: 'waiting',
      title: 'While its request waits',
      description:
        'A press on the marked tab of the explanation on app/chat/explain/marks showed its tab while its follow-up waits for a member. The request for PROD_DATABASE_URL waits just above the composer of the tab, with the command that the agent says it will run, Deny, and Allow for this session. The Working line and Stop show that the turn runs. The tab keeps the needs-input mark, and the header shows Needs input. The tab of Address autocomplete shows the parent chat with its marks again.',
      rationale:
        'An explanation is a normal session, so its tab holds its request above its composer, as the popover does, and its tab shows the needs-input mark (needs-input decision 2 B). The tab shows the same chat as the popover, so the request stays when the member changes between them. Each tab of this example opens the screen of that tab with the same open request.',
      props: explainWaitsWalk.states.tab.props,
    },
  ],
})
