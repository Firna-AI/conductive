import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeQueueMerge = defineScreen({
  title: 'Merge through the queue',
  description:
    'Checkout address autocomplete is place 3 of 3, and each of the three layers is in the GitHub stack and ready to merge. So the bar offers "Merge with 2 ahead": the click asks the queue to merge up to #482 as its next step, and GitHub lands #476 and #479 with it, into main.',
  rationale:
    'Cal chose option D of decision 316 on 22 November 2026: Merge shows on a queued workspace only while the layer and each layer below it are in the GitHub stack and ready, its label counts the layers below, and the click goes through the queue, with the token of the member who clicks. So one click never lands more, or into another branch, than the bar shows.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'ready-to-merge', queue: 'merge' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'merging',
      title: 'Merging',
      description:
        'The queue merges the three layers. The button shows a spinner and Merging, the line says "Merging into main", and the three rows of the group say Merging.',
      props: { queue: 'merging' },
    },
    {
      slug: 'waits',
      title: 'A lower layer is not ready',
      description:
        '#482 is ready to merge, but #476, place 1, still runs its checks. So the bar offers no Merge, and the line says that #482 waits for #476.',
      rationale:
        'A merge of #482 would land #476 with it, so Merge waits until every layer below is ready (decision 316 D).',
      props: { queue: 'waits' },
    },
    {
      slug: 'bottom',
      title: 'Merge of the bottom layer',
      description:
        'Checkout address autocomplete is place 1 of 3 and ready to merge. No layer lands with it, so Merge keeps its own label, Squash and merge, and the click still goes through the queue.',
      props: { queue: 'bottom-merge' },
    },
  ],
})
