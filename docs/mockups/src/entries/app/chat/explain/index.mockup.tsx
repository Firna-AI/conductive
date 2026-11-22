import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const explain = defineScreen({
  title: 'Explain',
  description:
    'Cal selected one line of the answer and pressed Explain. The app wrote a prompt with the context that the agent needs and sent it at once, so a new session explains the line. Its tab opened at the end of the row, and Address autocomplete stays the shown tab. The popover by the marked line shows the quote at its top, then the work of the turn folded into one line, the short answer, and the time of the turn. The follow-up field sends more messages to the explanation. Expand shows its tab, and the close button leaves the mark. On a phone the popover is a sheet at half height, so the marked line stays in view above it. The child pages show the selection with Explain, the popover in each state, the marks, a closed explanation, the tab, and a read-only workspace.',
  rationale:
    'The user chose Explain on 20 November 2026: a press sends a prompt that the app writes, and the member writes no prompt. The answer shows in a small popover by the mark, which replaces the large overlay of the first mockups. An explanation is a normal session, as the user chose on 17 November 2026 with A of side session placement, so every session rule stays. The popover hides the written prompt and shows the quote at its top, so the member reads only the answer. On a computer the popover opens below the mark, from its start, with a fixed width of 400 px and a highest height of 420 px, and its chat scrolls inside it. Where the frame has more room above the mark, it opens above it, so it never covers the marked text. It has no dim, because the parent chat stays live around it. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    explainMarks: 'asked',
    explainSession: 'answered',
    explainOpen: 'popover',
  },
  useCasePaths: ['user-flows/explain-chat-text'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
