import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const splitArchived = defineScreen({
  title: 'Split in an archived workspace',
  description:
    'Checkout address autocomplete is archived, and its saved split stays: Address autocomplete in the left pane, beside Debounce the address lookups to 250 ms in the right pane, which has the focus. An archived workspace shows only its sessions, so useAddressAutocomplete.ts is not in the left row. No row has a +, and no tab moves by a drag. The archived bar with Restore shows once, under both panes, in place of the two message fields. On a phone, the one row holds both sessions, and the bar is under the chat.',
  rationale:
    'A design call of 13 November 2026: a read-only workspace shows the saved split and binds no drag, and its tab menu leaves out each item that changes the workspace, as decision 214 says. A design call of the same day for the mockups shows the bar of the cloud computer once, under both panes, because it names the whole workspace and one Restore is enough. The screen hides the right column, so that two panes fit the frame of the catalogue.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    sandbox: 'archived',
    banner: 'merged',
    panes: 'sessions',
    rightColumn: 'hidden',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
