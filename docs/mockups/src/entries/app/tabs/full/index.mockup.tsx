import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const tabsFull = defineScreen({
  title: 'A full row',
  description:
    'The row has more tabs than fit. The tabs shrink to their minimum width, and the row scrolls sideways, with no scrollbar. The new session at the end of the row shows, so the row scrolled to it. A fade marks the start of the row, where it clips tabs. On a phone, the session tabs shrink to their icons, and the row scrolls in the same way.',
  rationale:
    'The user chose option B of decision 187 on 9 November 2026. The row keeps the shown tab in view, also a new tab at the end of the row, and every tab stays in reach of a click and a drag. A vertical turn of the mouse wheel scrolls the row sideways, and a finger scrolls it. During a drag, the pointer near an end scrolls the row, so a drop can reach every place.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, tab: 'new-session', tabRow: 'full' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
