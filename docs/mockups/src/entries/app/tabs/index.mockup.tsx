import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const tabs = defineScreen({
  title: 'Move tabs',
  description:
    'The user drags the useAddressAutocomplete.ts tab between the two sessions. The tab lifts under the pointer as a raised card, a faint copy stays where it was, and a line shows where it lands. Address autocomplete stays the shown tab. On a phone, a long press lifts Debounce the address lookups to 250 ms, and the line marks its place until the finger moves it.',
  rationale:
    'The user chose option B of decision 186 on 8 November 2026: any tab, a session or a file, moves to any place in the row. The row keeps one order for all its tabs, which the saved view of the user keeps. The drag looks like the drag of a workspace row, so every drag in the app looks the same. The line takes no space, so no tab moves during the drag, and the drag does not change the shown tab. A phone shows only the session tabs, and a long press lifts a tab, as it lifts a workspace row. The user chose option B of decision 287 on 12 November 2026: a move to another place keeps a temporary tab, as the Temporary tab page shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tabRow: 'drag' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
