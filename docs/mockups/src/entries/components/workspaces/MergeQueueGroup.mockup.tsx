import { defineComponent } from '@mokly/mokly'
import { MergeQueueGroup } from '../../../components/workspaces/MergeQueueGroup'
import { plainData } from '../../../defined'
import { queueListOf } from '../../../screens/queueLists'
import { oneQueue, twoQueues } from '../../../screens/queueSpecs'
import {
  drawnRowSchema,
  groupDropSchema,
  mergeQueueSchema,
} from './queueSchemas'

/** The group of one queue, with a layer in each step. */
const oneGroup = plainData(queueListOf(oneQueue))

/**
 * The Merge queue group at the top of the list, registered with Mokly. Its
 * pages show one queue, two queues, the group collapsed with its count,
 * the group on the list page, and the drop zone of a drag while no queue
 * has entries.
 */
export const mergeQueueGroup = defineComponent({
  slug: 'merge-queue-group',
  title: 'Merge queue group',
  description:
    "The group of the merge queues at the top of the list. It shows while a queue has entries, with one block for each queue, headed by its repository, and while a drag runs, as a drop zone. The group is the app's own, so it has no menu, and it collapses from its header with the count of its entries. Each block lists its layers from place 1, which merges first, then the entries that need attention. A member stack keeps its rows in one outline. Its own page shows one queue in the sidebar of Acme.",
  relatedDocs: ['docs/mockups/catalogue-workspace-list.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['queue', 'variant'],
    properties: {
      queue: mergeQueueSchema,
      variant: { enum: ['sidebar', 'page'] },
      /** The drag that the group draws. */
      drop: groupDropSchema,
      /** The one row whose menu or hover the view draws. */
      drawn: drawnRowSchema,
    },
  } as const,
  props: { queue: oneGroup, variant: 'sidebar' },
  render: (props) => (
    <MergeQueueGroup
      drawn={props.drawn}
      drop={props.drop}
      queue={props.queue}
      variant={props.variant}
    />
  ),
  variants: [
    {
      slug: 'two-queues',
      title: 'Two queues',
      description:
        'A block for acme/storefront and a block for acme/billing-service.',
      props: { queue: plainData(queueListOf(twoQueues)) },
    },
    {
      slug: 'collapsed',
      title: 'Collapsed',
      description: 'The group after a click on its header, with its count.',
      props: { queue: { ...oneGroup, collapsed: true } },
    },
    {
      slug: 'page',
      title: 'On the list page',
      description: 'The group on the list page of a phone, with taller rows.',
      props: { variant: 'page' },
    },
    {
      slug: 'zone',
      title: 'Drop zone',
      description:
        'A drag runs and no queue has entries, so the group waits as a drop zone.',
      props: { queue: { blocks: [] }, drop: { kind: 'zone' } },
    },
  ],
})
