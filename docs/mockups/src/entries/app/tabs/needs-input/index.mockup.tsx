import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import { otherTabWalk } from '../../../../screens/tabWalks'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const needsInputTab = defineScreen({
  title: 'A request in another tab',
  description:
    'Cal shows Debounce the address lookups to 250 ms, the second session. Its turn ended, and it holds no request. Address autocomplete, the first session, holds a late request for PROD_DATABASE_URL that nobody answered yet. Its tab shows the needs-input mark in place of its chat icon: the mark of a workspace that needs input in the list, blue, with its slow pulse. The header and the workspace list show Needs input, and the mark shows which tab holds the request. A press on the tab shows the request just above the composer of that session, as app/secret-requests/late shows, and its tab of the second session comes back here. A press on the code file keeps the mark on the tab of the first session. On a phone, the row shows only the session tabs, and Address autocomplete shows the same mark. Screen readers hear "Needs input" before the title of the tab. The child pages show the code file with the mark, the mark on a tab whose turn runs, and the marks with reduced motion.',
  rationale:
    'The user chose option B of decision 2 of the needs-input change on 20 November 2026: each session tab whose session holds an open request shows the needs-input mark. Each chat shows only the requests of its own session, so the mark shows the right tab from every tab, also on a phone. A click on the row of the workspace keeps the rule of the tab at a return, and the marked tab then shows the way to the request. A design call of 20 November 2026: the mark is the list mark of a workspace that needs input, so needs input looks the same in the list and in the row. It keeps the room of the chat icon, so the title does not move. The other states are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...otherTabWalk.states.second.props },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
