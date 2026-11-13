import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const tabsMoved = defineScreen({
  title: 'After the move',
  description:
    'The useAddressAutocomplete.ts tab now sits between the two sessions. Then + started a new session, and its tab opened at the end of the row as the shown tab. A phone shows only the sessions, in the same order.',
  rationale:
    'Decision 186 keeps one rule for every new tab, a session or a file: it opens at the end of the row. The order stays after a reload and on the other devices of the user, because the saved view keeps it.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tab: 'new-session', tabRow: 'moved' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
