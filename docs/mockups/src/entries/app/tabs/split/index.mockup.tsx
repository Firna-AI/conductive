import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const splitPanes = defineScreen({
  title: 'Split panes',
  description:
    'The user dropped the tab of Debounce the address lookups to 250 ms on the right half of the chat, so the centre column now shows two panes side by side. Each pane has its own tab row with its own +. The left row holds Address autocomplete and useAddressAutocomplete.ts. The right row holds the dropped session, and the session history stays at its far right. The right pane has the focus, so the icon of its shown tab takes the accent colour, and the shown tab of the left pane keeps its fill with a quieter title. Each session has its own message field. A hairline parts the panes, and a drag of the divider on it moves the split. The user hid the right column. On a phone, one row holds the session tabs of the left pane, a short line, then the session tabs of the right pane, and the chat shows the session of the focused pane.',
  rationale:
    'Split panes decision 1 C, which the user chose on 13 November 2026: each pane has its own tab row and its own +, as each editor group of VS Code has, so a click on a tab never depends on the focus. Split panes decision 2 A, from the same day: at most two panes, side by side. A design call of 13 November 2026 marks the focused pane in its row: the icon of its shown tab takes the accent colour, as the current item of the org rail does, and the shown tab of the other pane keeps its fill with a quieter title. One pane draws no mark. No tab gets an accent strip, and the row gets no new part. The session history reopens a session in the focused pane (split panes decision 3 B). Split panes decision 6 G, which the user chose on 16 November 2026: on desktop the split never turns into one row. The right column gives way first, down to 280 px, so that each pane keeps 320 px, and then both panes shrink with the window. The screen hides the right column, so that each pane has more room in the frame of the catalogue. The A narrow window page shows the split beside the right column.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, panes: 'sessions', rightColumn: 'hidden' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
