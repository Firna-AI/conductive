import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueTwoQueues = defineScreen({
  title: 'Two queues',
  description:
    'Two repositories of Acme have queues, so the group holds two blocks, in the order of the repositories of the org: acme/storefront with three layers, then acme/billing-service with two. Each block counts its places from 1, because each queue lands in the default branch of its own repository. Move retries to a queue rebases onto #318, the layer below it in its own block.',
  rationale:
    'Decision 320 gives each repository one queue, into its default branch. A section can mix workspaces of several repositories, so the group splits its rows by repository, and a block never mixes two stacks.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'two',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'collapsed',
      title: 'Collapsed',
      description:
        'A click on the header of the group collapses it, as a section collapses. The header then shows 5, the count of the entries of both queues.',
      props: { mergeQueue: 'collapsed' },
    },
  ],
})
