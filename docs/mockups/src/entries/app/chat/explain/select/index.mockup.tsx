import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const explainSelect = defineScreen({
  title: 'Explain a selection',
  description:
    'Cal selected one line of the finished answer: "Manual entry still works when there is no match." Explain and Ask float in one bar just above the middle of the selection, as the selection tools of most editors do. So the bar covers none of the text that Cal reads next. A press on Explain sends the written prompt at once and opens the popover. A press on Ask opens the popover with an empty field for a question, and starts nothing before Send. On a phone the phone shows its own selection menu above the selection and its handles at its ends. So the bar stands above the composer, away from them, where a thumb reaches it.',
  rationale:
    'A member can explain finished text inside one agent answer or one member message, and not tool lines or notices. A selection stays inside one message. The buttons are normal controls, so Tab reaches Explain from the selection, then Ask. The user chose B of keyboard start on 17 November 2026: a keyboard shortcut also explains the current selection, ⌥⌘E on a Mac. The user asked for Ask on 24 November 2026, so that the member can add a question, and chose that Ask stands just after Explain in the same bar, with no key of its own. On a computer, the button first hung under the end of the selection. The user said on 20 November 2026 that this place looked odd, because it stood away from the text, over the next line. So it moved above the middle of the selection. A phone opens its selection menu above or below the selection, so a button by the selection could hide under it, and the bottom of the chat stays free.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, banner: 'checks-running', explainOpen: 'select' },
  useCasePaths: [
    'user-flows/explain-chat-text',
    'user-flows/ask-about-chat-text',
  ],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'message',
      title: 'In a member message',
      description:
        'Cal selected "keep the manual fields as a fallback" in his own first message. Explain and Ask show in the same way. In a bubble at the right of the chat, their bar stands above the selection and lines up with its end, so it stays inside the chat.',
      props: { explainOpen: 'select-message' },
    },
  ],
})
