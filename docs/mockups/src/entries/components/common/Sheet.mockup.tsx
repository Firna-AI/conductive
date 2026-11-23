import { defineComponent } from '@mokly/mokly'
import { Sheet } from '../../../../../../src/ui/components/common/Sheet'

/**
 * The sheet that rises from the bottom of a phone screen, registered with
 * Mokly. A screen supplies its content in the `children` slot.
 */
export const sheet = defineComponent({
  slug: 'sheet',
  title: 'Sheet',
  description:
    'A sheet that rises from the bottom of a phone screen over a dimmed page, for a menu or a dialog that a phone opens in place of a desktop one: a handle, a title, and a body that scrolls. Its own page shows the sheet with an empty body.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: { title: { type: 'string' } },
  } as const,
  slots: ['children'],
  props: { title: 'Repository' },
  render: (props) => <Sheet title={props.title}>{props.children}</Sheet>,
})
