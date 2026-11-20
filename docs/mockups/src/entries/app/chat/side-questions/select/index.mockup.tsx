import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

const flow = ['user-flows/ask-a-side-question']

export const sideQuestionSelect = defineScreen({
  title: 'Ask about this',
  description:
    'Cal selected one line of the finished answer: "Manual entry still works when there is no match." Ask about this floats just above the middle of the selection, as the selection tools of most editors do. So it covers none of the text that Cal reads next, and a press opens the prompt field under the selection. On a phone the phone shows its own selection menu above the selection and its handles at its ends. So Ask about this stands above the composer, away from them, where a thumb reaches it.',
  rationale:
    'A member can ask about finished text inside one agent answer or one member message, and not about tool lines or notices. A selection stays inside one message. The button is a normal control, so Tab reaches it from the selection. The user chose B of keyboard start on 17 November 2026: a keyboard shortcut also starts a side question about the current selection, and the protocol doc of side questions will choose its key. On a computer, the button first hung under the end of the selection. The user said on 20 November 2026 that this place looked odd, because it stood away from the text, over the next line. So it moved above the middle of the selection. A phone opens its selection menu above or below the selection, so a button by the selection could hide under it, and the bottom of the chat stays free.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, banner: 'checks-running', sideOpen: 'select' },
  useCasePaths: flow,
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'message',
      title: 'In a member message',
      description:
        'Cal selected "keep the manual fields as a fallback" in his own first message. Ask about this shows in the same way. In a bubble at the right of the chat, it stands above the selection and lines up with its end, so it stays inside the chat.',
      props: { sideOpen: 'select-message' },
    },
    {
      slug: 'prompt',
      title: 'The prompt field',
      description:
        'A press on Ask about this opened the prompt field under the selection, from the start of the selection, focused, and the selection stays. Cal wrote "How many saved addresses have no postcode?". The line beside Cancel says that the question starts a new session. Send starts the side session and opens its overlay, and Cancel or Escape closes the field. On a phone the field opens in a sheet, with the quoted text above it.',
      rationale:
        'The side session uses the login and the default model of the member who asks, as a session that `create_session` starts does, so the field has no model picker. Send is off until the field holds text.',
      props: { sideOpen: 'prompt' },
      useCasePaths: flow,
    },
  ],
})
