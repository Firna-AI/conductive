import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const panels = defineScreen({
  title: 'Panel widths',
  description:
    'On desktop the sidebar and the right column each have a handle on their inner edge, next to the chat. Here the user drags the handle of the right column to widen it. A phone has no columns to resize.',
  rationale:
    'A handle is a hairline at rest. On hover and during a drag it brightens, and a short grip in the accent colour shows in its middle, so no panel gets an accent edge. The sidebar starts at 232 px and resizes from 200 to 360 px. The right column starts at 440 px and resizes from 320 to 640 px. The app remembers each width.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, resize: 'right' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
