import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const panels = defineScreen({
  title: 'Panels',
  description:
    'On desktop the sidebar and the right column each have a handle on their inner edge, next to the chat. A third handle lies between the file lists and the tools panel of the right column. Here the user drags the handle of the right column to widen it. The toggle at the end of the header hides the right column. A phone has no columns to resize or hide.',
  rationale:
    'A handle is a hairline at rest. On hover and during a drag it brightens, and a short grip in the accent colour shows in its middle, so no panel gets an accent edge. The sidebar starts at 232 px and resizes from 200 to 360 px. The right column starts at 440 px and resizes from 320 to 640 px. The file lists start at 55% of the height below the pull request bar and resize from 20% to 80%, so the split keeps its place when the window changes height. The app remembers each width and the split. The toggle stays at the end of the header, so the same button shows the right column again.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, resize: 'right' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'split',
      title: 'Split of the right column',
      description:
        'The user drags the handle between the file lists and the tools panel up, so the tools panel takes more of the column. The handle crosses the column, and its grip shows in its middle.',
      props: { resize: 'split' },
    },
    {
      slug: 'right-hidden',
      title: 'Right column hidden',
      description:
        'The user hid the right column with the toggle at the end of the header. The chat and its header take the full width. The toggle now shows the right column again.',
      props: { resize: 'none', rightColumn: 'hidden' },
    },
  ],
})
