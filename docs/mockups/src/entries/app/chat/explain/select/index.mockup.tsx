import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const explainSelect = defineScreen({
  title: 'Explain a selection',
  description:
    'Cal selected one line of the finished answer: "Manual entry still works when there is no match." Explain floats just above the middle of the selection, as the selection tools of most editors do. So it covers none of the text that Cal reads next. A press sends the written prompt at once and opens the popover. On a phone the phone shows its own selection menu above the selection and its handles at its ends. So Explain stands above the composer, away from them, where a thumb reaches it.',
  rationale:
    'A member can explain finished text inside one agent answer or one member message, and not tool lines or notices. A selection stays inside one message. The button is a normal control, so Tab reaches it from the selection. The user chose B of keyboard start on 17 November 2026: a keyboard shortcut also explains the current selection, and the protocol doc of Explain will choose its key. On a computer, the button first hung under the end of the selection. The user said on 20 November 2026 that this place looked odd, because it stood away from the text, over the next line. So it moved above the middle of the selection. A phone opens its selection menu above or below the selection, so a button by the selection could hide under it, and the bottom of the chat stays free.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, banner: 'checks-running', explainOpen: 'select' },
  useCasePaths: ['user-flows/explain-chat-text'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'message',
      title: 'In a member message',
      description:
        'Cal selected "keep the manual fields as a fallback" in his own first message. Explain shows in the same way. In a bubble at the right of the chat, it stands above the selection and lines up with its end, so it stays inside the chat.',
      props: { explainOpen: 'select-message' },
    },
  ],
})
