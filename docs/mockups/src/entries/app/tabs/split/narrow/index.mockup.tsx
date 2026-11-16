import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const splitNarrow = defineScreen({
  title: 'A narrow window',
  description:
    'The two panes of the Split panes page are open, and the right column shows. On desktop the split never turns into one row. While two panes show, the right column first gives way to them, down to 280 px, so that each pane keeps 320 px. In a laptop window of 1280 px, the right column narrows from 436 px to 358 px. In a window narrower than 1179 px, the right column stays at 280 px, and both panes shrink with the window. A pane narrower than 360 px gives its chat the paddings of a phone, as each pane in the frame of the catalogue shows. Each pane keeps its row, its message field, and the drop marks of a drag. The user can hide the right column to give the panes its room. On a phone, one row holds the session tab of the left pane, a short line, then the session tab of the right pane, with one + and the session history at its end, and the chat shows the session of the focused pane.',
  rationale:
    'Split panes decision 6 G, which the user chose on 16 November 2026, after the user wrote that a split that stops at a fixed width of the window is confusing: on desktop, the split never turns into one row. The right column narrows first, to its least width of 280 px, so each pane keeps 320 px from a window of 1179 px. Then the two panes shrink with the window, with no least width, and nothing hides or changes shape at a fixed width. A pane narrower than 360 px, the width that the app keeps for one chat, gives its chat the paddings of a phone, so its text keeps the room that a phone gives it. Only the phone layout, below 640 px, shows one row. A design call of 13 November 2026 for the mockups puts a short neutral line at the border of the two parts of that row, so the user sees where the tabs of each pane start. The one row keeps one +, which opens a new session in the focused pane, and the session history at its end. The catalogue cannot set the width of a window, so the desktop view follows the width of its frame: expand the frame, or open the view in a wide window, to see the right column give way.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, panes: 'sessions' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'file',
      title: 'With a file pane',
      description:
        'The split of the A session beside a file page, in the same narrow window. The right column gives way first, then both panes shrink. The chat of a pane narrower than 360 px takes the paddings of a phone, and the file page drops its line count and its file icon, as a narrow page does. On a phone, the row holds only the two sessions, because a pane that holds only files has no tab in the row of a phone.',
      rationale:
        'Split panes decision 6 G, which the user chose on 16 November 2026: a pane of any kind shrinks with the window, so a file pane narrows as a chat pane does. A design call of 13 November 2026: the row of a phone still shows only session tabs, so a pane that holds only files has no tab there. A phone shows each file in its Files tab.',
      props: { panes: 'file' },
    },
  ],
})
