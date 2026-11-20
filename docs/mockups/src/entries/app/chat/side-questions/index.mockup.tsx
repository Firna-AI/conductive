import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sideQuestions = defineScreen({
  title: 'Side questions',
  description:
    'Cal asked a side question about one line of the answer: "How many saved addresses have no postcode?". Its side session opened as a new tab at the end of the row, and Address autocomplete stays the shown tab. The overlay shows the side session over its parent: the first message, with the question, the quote, and the session chip of Address autocomplete, then the agent at work. The composer of the overlay steers the turn, Stop ends it, and Open as tab shows its tab. In the parent chat the quote keeps its mark, with the spinner of a running turn. On a phone the overlay is a sheet, which stops under the tab row. The child pages show the selection with Ask about this and the prompt field, the marks in each state, the overlay in each state, the side session in its tab, and a read-only workspace.',
  rationale:
    'The user asked for side questions on 17 November 2026, and chose A of side session placement: a side question is a normal session, and every session rule stays. It opens as a normal tab, the mark opens it in an overlay, and Open as tab shows its tab. The user also chose A of what the side agent knows: the first message holds the prompt, the quote, and a link to the parent session, and the agent reads the parent with `read_session` when it needs more. The prompt is the first line, so it becomes the title of the session. A new tab opens at the end of the row, as each new tab does, and the parent tab stays shown under the overlay. The overlay is a dialog on a computer and a sheet on a phone, as the other overlays of the app are. Its dim is lighter than the dim of a question, so the parent chat stays readable around it. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    banner: 'checks-running',
    sideMarks: 'asked',
    sideSession: 'running',
    sideOpen: 'overlay',
  },
  useCasePaths: ['user-flows/ask-a-side-question'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
