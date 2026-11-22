import { defineScreen } from '@mokly/mokly'
import {
  WorkspaceListScreen,
  workspaceListSchema,
} from '../../../../screens/WorkspaceListScreen'

export const mergeQueueDrag = defineScreen({
  title: 'Drags',
  description:
    'Cal drags Checkout address autocomplete from place 3 to place 2 of acme/storefront. The row lifts under the pointer as in a section, a faint copy stays at place 3, and the drop line falls between Upgrade to Next.js 16 and Apple Pay button, where the line that joins the marks opens. On a phone a long press lifts the row.',
  rationale:
    'A member with write access re-orders the queue by a drag, as in a section. Every member sees one order. The drop line falls only inside the block of the row, because each block is the stack of one repository.',
  relatedDocs: [],
  propSchema: workspaceListSchema,
  props: {
    list: 'workspaces',
    menu: 'none',
    palette: 'closed',
    mergeQueue: 'reorder',
  },
  render: (props, context) => (
    <WorkspaceListScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'add',
      title: 'Drag a row into the group',
      description:
        'Cal drags Fix flaky cart test from Checkout over the group. The queue of acme/storefront, its repository, takes the outline and the soft fill of a drop target, and the drop line falls after place 3, where the row joins. A faint copy stays in Checkout.',
      rationale:
        'Decision 317 D adds a drag of a row into the group, which shows as a drop target during each drag. A new entry joins at the top of the stack, so the drop line always falls after the last layer of the block.',
      props: { mergeQueue: 'add' },
    },
    {
      slug: 'zone',
      title: 'Drop zone of an empty queue',
      description:
        'No queue has entries, and Cal drags Retry failed webhooks to General. The group shows at the top of the list as a zone with a dashed outline and its words, while the drag lasts. Without a drag, the list shows no group.',
      rationale:
        'The group shows as a drop target during each drag, also when no queue has entries (decision 317 D), so the drag into the queue needs no other control.',
      props: { mergeQueue: 'zone' },
    },
    {
      slug: 'add-empty',
      title: 'Drop on the empty zone',
      description:
        'Cal drags Apple Pay button over the zone. The zone takes the outline and the fill of the accent, and the lifted row floats over it. After the drop, a block of acme/storefront holds Apple Pay button at place 1.',
      props: { mergeQueue: 'add-empty' },
    },
  ],
})
