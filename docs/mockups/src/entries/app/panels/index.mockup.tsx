import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const panels = defineScreen({
  title: 'Panels',
  description:
    'On desktop the sidebar and the right column each have a handle on their inner edge, next to the chat. A third handle lies between the file lists and the tools panel of the right column. Here the user drags the handle of the right column to widen it. The toggle at the end of the header hides the right column, and the toggle beside the cog of Settings hides the sidebar. A phone has no columns to resize or hide.',
  rationale:
    'A handle is a hairline at rest. On hover and during a drag it brightens, and a short grip in the accent colour shows in its middle, so no panel gets an accent edge. The sidebar starts at 232 px and resizes from 200 to 360 px. The right column starts at 440 px and resizes from 320 to 640 px. The file lists start at 55% of the height below the pull request bar and resize from 20% to 80%, so the split keeps its place when the window changes height. The app remembers each width and the split. The toggle stays at the end of the header, so the same button shows the right column again. A hidden sidebar comes back from the popover of the org tile, which holds the same toggle, and from the palette. The popover opens only from the tile of the current org, because a tile of another org opens that org first. In a window narrower than 900 px the sidebar cannot show, so the popover there has no toggle, and the list page of the org opens no popover, because it shows the list already.',
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
    {
      slug: 'sidebar-hidden',
      title: 'Sidebar hidden',
      description:
        'The user hid the sidebar with the toggle beside the cog of Settings. The rail stays, and the main area takes the width of the sidebar.',
      props: { resize: 'none', sidebar: 'hidden' },
    },
    {
      slug: 'list-popover',
      title: 'Workspace list popover',
      description:
        'With the sidebar hidden, a click on the tile of the current org opens the workspace list as a popover beside the rail, over the workspace. It holds the whole sidebar. Its toggle beside the cog shows the sidebar again. A click on a workspace opens it and closes the popover, and so do Escape, a click outside, and a second click on the tile.',
      props: { resize: 'none', sidebar: 'popover' },
    },
  ],
})
