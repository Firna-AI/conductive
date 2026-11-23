import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const bannerMergeQueue = defineScreen({
  title: 'Merge queue in the bar',
  description:
    'Cal added Checkout address autocomplete to the merge queue. It joined at the top of the stack of acme/storefront, place 3 of 3, and its checks run again. The line under the bar names its place and the pull request below it: "Place 3 of 3 in the merge queue. It builds on #479." Remove from queue ends the line. The bar keeps the GitHub state of #482 and its main action, here none while the checks run. In the sidebar, the row is selected in the Merge queue group. On a phone the compact row says Queue 3 of 3, and the line stands at the top of the Checks tab. The child pages show Add to merge queue, the bottom layer and a conflict of a restack, with the one turn of the queue and the wait for a member, Merge with the layers below and the wait for local work, an entry that cannot merge with the layers that wait for it, and the question before Remove from queue.',
  rationale:
    'The bar of a queued workspace names its place and the pull request below it, and gets Remove from queue (decision 317 and the plan of the merge queue). The line takes the place and the parts of a message under the bar, so the bar keeps its one main action of decision 220. Each queued pull request targets the branch of the layer below it, so "builds on" names that layer. The words avoid "above" and "below", because the group lists place 1, the bottom layer, first.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'checks-running', queue: 'upper' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
