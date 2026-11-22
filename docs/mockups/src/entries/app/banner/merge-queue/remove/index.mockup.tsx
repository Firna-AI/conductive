import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeQueueRemove = defineScreen({
  title: 'Remove from queue',
  description:
    'Cal pressed Remove from queue on Checkout address autocomplete, place 3 of 3. A question asks first: #482 loses its place and targets main again, and Add to merge queue later puts it at the end of the queue. Remove from queue confirms, and Cancel keeps the entry. On a phone the question opens as a sheet.',
  rationale:
    'Remove from queue is a cause of the one leave step of the queue: the pull request targets the default branch again, and the layers above it move onto the layer below it. The entry cannot get its place back, so the bar asks first.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    banner: 'checks-running',
    queue: 'upper',
    overlay: 'remove-from-queue',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'stack',
      title: 'Lower entry of a member stack',
      description:
        'Checkout address autocomplete is the lower entry of a member stack with Saved carts (#490). The question says that Saved carts builds on this pull request, so it leaves the queue too.',
      rationale:
        'A member stack moves as one unit (decision 315 A), so Remove from queue on a lower entry also removes the entries above it in the unit, and the question says so.',
      props: { banner: 'ready-to-merge', queue: 'stack' },
    },
  ],
})
