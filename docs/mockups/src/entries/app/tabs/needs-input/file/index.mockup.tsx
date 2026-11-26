import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import { otherTabWalk } from '../../../../../screens/tabWalks'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const needsInputFile = defineScreen({
  title: 'A file tab',
  description:
    'Cal shows useAddressAutocomplete.ts, the code file that stays open, while Address autocomplete, the first session, still holds its late request for PROD_DATABASE_URL. The tab of the first session keeps the needs-input mark, and the header and the workspace list keep Needs input. A press on that tab shows the request just above its composer, as app/secret-requests/late shows. A press on the tab of the second session shows that session, as the parent page shows. On a phone, the row holds only the session tabs, so the page shows the files.',
  rationale:
    'The user chose option B of decision 2 of the needs-input change on 20 November 2026: each session tab whose session holds an open request shows the needs-input mark, so the mark stays while another tab shows. Each tab of this example opens the screen of that tab with the same open request, so the request never drops out of the example when the tab changes.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, ...otherTabWalk.states.file.props },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
