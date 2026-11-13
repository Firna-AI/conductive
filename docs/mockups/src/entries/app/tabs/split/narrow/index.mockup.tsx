import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const splitNarrow = defineScreen({
  title: 'One row in a narrow column',
  description:
    'The two panes of the Split panes page are open, and the right column shows at its default width. In a window narrower than 1363 px, such as a laptop window of 1280 px, the centre column is then narrower than two panes of 320 px, so it shows one row and one pane. The row holds the tabs of the left pane, a short line, then the tab of the right pane, with one + and the session history at its end. The pane shows Debounce the address lookups to 250 ms, the shown tab of the focused pane. A press on a tab of the left part shows that tab and gives the left pane the focus. The saved split stays, and the two panes come back when the column has room. On a phone, the row holds only the session tabs of both panes.',
  rationale:
    'A design call of 13 November 2026: a phone, and a centre column narrower than two panes of 320 px, show one row with the tabs of the left pane first, and the content of the focused pane. No tab moves by a drop on the content there, and a drag across the border of the two parts moves a tab to the other pane, at that place. A design call of the same day for the mockups puts a short neutral line at that border, so the user sees where the tabs of each pane start. The line is a divider, not an accent. The one row keeps one +, which opens a new session in the focused pane, and the session history at its end. When its tabs do not fit, the row scrolls and keeps the shown tab in view, as each tab row does (decision 187). An expanded frame of the catalogue that is 1363 px wide or more shows the two panes.',
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
        'The split of the A session beside a file page, in the same narrow column. The row holds the two sessions, a short line, then useAddressAutocomplete.ts, and the pane shows Address autocomplete, the shown tab of the focused left pane. On a phone, the row holds only the two sessions, because a pane that holds only files has no tab in the row of a phone.',
      rationale:
        'A design call of 13 November 2026: the row of a phone still shows only session tabs, so a pane that holds only files has no tab there. A phone shows each file in its Files tab.',
      props: { panes: 'file' },
    },
  ],
})
