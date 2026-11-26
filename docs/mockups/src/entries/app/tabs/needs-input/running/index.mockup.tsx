import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const needsInputRunning = defineScreen({
  title: 'The turn of the tab runs',
  description:
    'Cal shows Address autocomplete. Its turn runs, and its tool call waits for the answer to the request for PROD_DATABASE_URL just above the composer. Its tab shows the needs-input mark in place of the spinner of a running turn. The Working line and Stop still show that the turn runs. After an answer, the mark ends, and the spinner shows while the turn runs on, as app/secret-requests/results shows. On a phone, the shown tab of the row shows the same mark. A request for a command on the Mac sets the mark in the same way.',
  rationale:
    'A design call of 20 November 2026: the mark wins over the spinner of a running turn, because the member must act. The shown tab carries the mark too, because the region of that tab then holds the request, and the same rule for each tab is simpler.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'secret-waiting' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
