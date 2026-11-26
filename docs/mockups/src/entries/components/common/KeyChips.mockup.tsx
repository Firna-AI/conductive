import { defineComponent } from '@mokly/mokly'
import { KeyChips } from '../../../../../../src/ui/components/common/KeyChips'
import { shortcutSchema } from './shortcutSchemas'

/**
 * A shortcut as small key chips, one for each key, registered with Mokly.
 * Its pages show a key of a Mac, a key that a browser tab keeps, and a key
 * of Windows.
 */
export const keyChips = defineComponent({
  slug: 'key-chips',
  title: 'Key chips',
  description:
    'A shortcut as small key chips, one for each key: each modifier, then the key. A screen reader hears the names of the keys, such as Command K. A dimmed key does not work where the page runs, such as a key that a browser tab keeps. Its own page shows ⌘K.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['shortcut'],
    properties: {
      /** The keys as its keyboard prints them, such as ⌥⌘/ or Ctrl+K. */
      shortcut: shortcutSchema,
      /** The key does not work where the page runs. */
      dimmed: { type: 'boolean' },
    },
  } as const,
  props: { shortcut: ['⌘', 'K'] },
  render: (props) => (
    <KeyChips dimmed={props.dimmed} shortcut={props.shortcut} />
  ),
  variants: [
    {
      slug: 'dimmed',
      title: 'Kept by the browser',
      description:
        'A key that a browser tab keeps: an outline with dashes and no fill.',
      props: { shortcut: ['⌘', 'W'], dimmed: true },
    },
    {
      slug: 'windows',
      title: 'Windows',
      description:
        'The modifiers of a Windows keyboard as words, joined with +.',
      props: { shortcut: ['Ctrl', 'Shift', 'T'] },
    },
  ],
})
