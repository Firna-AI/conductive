import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeQueueAttention = defineScreen({
  title: 'Needs attention',
  description:
    'The checks of #482 still fail after its one fix turn, so the entry left the GitHub stack, and the layers above it moved onto the layer below it. The line under the bar is amber: "Needs attention: the checks still fail after one fix." The bar offers Fix checks and Add to merge queue, which joins the entry again at the top of the stack. In this narrow column, Add to merge queue shows only its icon. Remove from queue ends the line. In the sidebar, the row stands after the rows of the stack, off the line that joins them, with its red mark and no label.',
  rationale:
    'A red layer gets one fix turn. When it still cannot merge, the entry leaves the stack and stays in the group below it until a member acts. Add to merge queue on it joins it again at the top (decision 317). The amber tint fills the whole line, as the tint of a bar state does.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'checks-failed', queue: 'attention' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'merge-refused',
      title: 'GitHub refused the merge',
      description:
        'GitHub refused the merge of the queue, so #482 left the stack. The line says so and leads to the pull request on GitHub, where GitHub names the reason. The entry is not in the stack, so the bar offers no Merge, and Add to merge queue stands alone.',
      props: { banner: 'ready-to-merge', queue: 'refused' },
    },
  ],
})
