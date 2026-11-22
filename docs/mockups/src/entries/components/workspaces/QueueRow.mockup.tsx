import { defineComponent } from '@mokly/mokly'
import { QueueRowView } from '../../../components/workspaces/QueueRow'
import type { QueueEntry } from '../../../components/workspaces/queue'
import { plainData } from '../../../defined'
import { queueListOf } from '../../../screens/queueLists'
import { oneQueue, stackQueue } from '../../../screens/queueSpecs'
import { queueEntrySchema } from './queueSchemas'
import { rowControlsSchema } from './rowSchemas'

/** The block of acme/storefront of a queue state, as JSON. */
function storefront(spec: typeof oneQueue) {
  const [block] = plainData(queueListOf(spec)).blocks
  if (!block) throw new Error('The state has no queue')
  return block
}

/** An entry of a block by its workspace. */
function entryOf(entries: readonly QueueEntry[], key: string): QueueEntry {
  const entry = entries.find((item) => item.row.workspace.key === key)
  if (!entry) throw new Error(`The block has no entry ${key}`)
  return entry
}

const one = storefront(oneQueue)

/**
 * One entry of a queue in the Merge queue group, registered with Mokly.
 * Its pages show a layer that rebases onto the layer below it, an entry
 * that needs attention, a row of the list page, and the lifted first row
 * of a member stack.
 */
export const queueRow = defineComponent({
  slug: 'queue-row',
  title: 'Queue row',
  description:
    'One entry of a queue in the Merge queue group: its place, its list mark, and its name, with its step under the name. The mark shows the GitHub state of its checks, as in the sections. An entry that needs attention shows the alert icon in place of its place, and its reason under its name. A drag lifts the row, and the lifted first row of a member stack shows the count of the rows that move with it. Its own page shows place 3 while it rebases onto #479.',
  relatedDocs: ['docs/mockups/catalogue-workspace-list.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['entry', 'place', 'variant'],
    properties: {
      entry: queueEntrySchema,
      /** Its place in the stack, or null for an entry that needs attention. */
      place: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
      /** The compact row of the sidebar, or the taller row of the page. */
      variant: { enum: ['sidebar', 'page'] },
      drag: { enum: ['lifted', 'placeholder'] },
      /** The rows of its member stack that move with a lifted row. */
      carried: { type: 'integer', minimum: 0 },
      controls: rowControlsSchema,
    },
  } as const,
  props: {
    entry: entryOf(one.entries, 'checkout-autocomplete'),
    place: 3,
    variant: 'sidebar',
  },
  render: (props) => (
    <QueueRowView
      carried={props.carried}
      controls={props.controls}
      drag={props.drag}
      entry={props.entry}
      place={props.place}
      variant={props.variant}
    />
  ),
  variants: [
    {
      slug: 'attention',
      title: 'Needs attention',
      description:
        'An entry below the stack: the alert icon in place of its place, and its reason under its name.',
      props: { entry: entryOf(one.attention, 'fix-cart-flake'), place: null },
    },
    {
      slug: 'page',
      title: 'On the list page',
      description: 'A taller row of the list page of a phone, for touch.',
      props: { variant: 'page' },
    },
    {
      slug: 'lifted',
      title: 'Lifted member stack',
      description:
        'The first row of a member stack under the pointer, with +1 for the row that moves with it.',
      props: {
        entry: entryOf(storefront(stackQueue).entries, 'checkout-autocomplete'),
        place: 1,
        drag: 'lifted',
        carried: 1,
      },
    },
  ],
})
