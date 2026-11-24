import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

const flow = ['user-flows/ask-about-chat-text']

export const explainAsk = defineScreen({
  title: 'Ask about a selection',
  description:
    'Cal selected "Manual entry still works when there is no match." in the answer and pressed Ask. The popover opened at once below the line, and the line keeps the colours of a selection, with no handles. The header shows the quote and the close button. The chat is empty, because nothing started yet, and the field at the foot has the focus. Send is off while the field is empty. A close before Send drops the question and starts nothing, and no tab opens before Send. On a phone the popover is a sheet at half height, and the line stays in view above it.',
  rationale:
    'The user asked for Ask on 24 November 2026: "add ask next to explain, that allows the user then to add a custom message - but otherwise similar to explain". The user chose A of where the member types the message: Ask opens the popover at once, with the quote and an empty field, and Send starts the session. A field by the selection that turns into the popover after Enter was rejected. The user rejected that shape on 20 November 2026, it can cover the text, and on a phone it competes with the selection menu. The focus moves into the field, so the page loses its selection, and the text keeps the colours of a selection. It takes no mark, because no explanation exists before Send. The popover leaves out Expand, because no tab exists before Send.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, banner: 'checks-running', explainOpen: 'ask' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'typed',
      title: 'A question to send',
      description:
        'Cal wrote "Does manual entry still fill the city from the postcode?" in the field, and Send is on. The field grows with the question up to four lines, so on a phone the question takes two lines. Nothing starts before Send, so Close still drops the question.',
      rationale:
        'Send stays off while the field is empty, so each Ask carries a question. The field takes text only, with no attach button and no model picker, as the follow-up field has none. After Send, Expand gives the whole composer of the tab.',
      props: { explainOpen: 'ask-typed' },
      useCasePaths: flow,
    },
    {
      slug: 'sent',
      title: 'Just after Send',
      description:
        'Cal pressed Send. The app wrote the prompt with his question as its first line and sent it, so a new session explains the line. Its tab opened at the end of the row, with the question as its title, and Address autocomplete stays the shown tab. The line took its mark, with the spinner of a session tab, and the popover keeps to it. The popover shows the chat of the new session without the written prompt: the working line under the quote. The field is empty again, with the focus, for a follow-up, and Stop ends the turn. Expand now shows the tab.',
      rationale:
        'The user chose A of the written prompt of an Ask on 24 November 2026: the question comes first, so it gives the title, and the context and the three requests of Explain follow. A first line that names the quote was rejected, because the title and the tooltip of the mark then do not show the question. An Ask is an explanation, so its anchor, its mark, its states, its login, and fast mode off are those of Explain.',
      props: {
        explainMarks: 'question',
        explainSession: 'working',
        explainOpen: 'popover',
      },
      useCasePaths: flow,
    },
    {
      slug: 'answered',
      title: 'The answer',
      description:
        'The agent read the hook and the form, and it answered the question in two sentences. The popover shows the work of the turn folded into one line, the answer, and the time of the turn, as for Explain. The mark shows an ended turn, and the pointer over it shows the question. Expand shows the tab.',
      rationale:
        'The popover leaves out the written prompt, as for Explain. So the question shows in the title of the tab, in the tooltip of the mark, and in the first message of the tab.',
      props: {
        explainMarks: 'question',
        explainSession: 'answered',
        explainOpen: 'popover',
      },
      useCasePaths: flow,
    },
    {
      slug: 'tab',
      title: 'The tab of an Ask',
      description:
        'Expand showed the tab of the Ask at the end of the row, with the question as its title. The tab shows the written prompt as its first message: the question, the session chip of Address autocomplete, the message ID, the quote under "The selected text", the quote with the lines around it, and the three requests. Then come the work of the turn and the answer. On a phone the tab shows at the end of the session tabs.',
      rationale:
        'The tab hides nothing that the popover leaves out. The whole quote stands under "The selected text", because the question takes the first line, and no other line names the quote.',
      props: {
        tab: 'explanation',
        conversation: 'ask-explanation',
        explainMarks: 'question',
        explainSession: 'answered',
      },
      useCasePaths: flow,
    },
  ],
})
