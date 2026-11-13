import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const splitFile = defineScreen({
  title: 'A session beside a file',
  description:
    'The user dropped the useAddressAutocomplete.ts tab on the right half of the chat, then typed in the chat, so the left pane has the focus. The left row holds the two sessions, and Address autocomplete shows with its message field. The right pane shows the kept file, with its title upright, and its row holds only that tab, its +, and the session history. A press on another file in All files or Changes opens it in the right pane, because that pane shows a file. On a phone, which shows each file in its Files tab, the row holds only the two sessions.',
  rationale:
    'Split panes decision 1 C, which the user chose on 13 November 2026: any tab, a session or a file, goes in either pane, so the user reads a file beside the chat that changes it. Split panes decision 3 B, from the same day: a press on a file or a diff opens it in the pane that shows a file or a diff, so the press does not hide the chat that the user types in. A pane that shows a file has no message field. The screen draws a kept file and no temporary tab, because split panes decision 5, the temporary tab with two panes, is still open.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, panes: 'file', rightColumn: 'hidden' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'resize',
      title: 'Move the divider',
      description:
        'The user drags the divider to the left, so the file gets more room. The hairline between the panes brightens, and the grip of the divider shows in its middle in the accent colour. The chat keeps 40% of the column, and never less than 320 px. A phone shows one pane, so it has no divider, and its view is the one row of this split.',
      rationale:
        'A design call of 13 November 2026: a divider between the panes moves the split, and the browser keeps the share of the left pane, as it keeps the widths of the panels. The divider is the handle of the panels, so every resize in the app looks the same, and no pane gets an accent edge. A pane is at least 320 px wide, the least width of the right column, so a drag stops there.',
      props: { resize: 'panes' },
    },
  ],
})
