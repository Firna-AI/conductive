import { defineComponent } from '@mokly/mokly'
import { ChipCopyText } from '../../../../../../src/ui/components/chat/ChipCopyText'

/**
 * The text that a copy of a chip gives, registered with Mokly. It shows
 * only while a copy runs, so its own page shows nothing.
 */
export const chipCopyText = defineComponent({
  slug: 'chip-copy-text',
  title: 'Chip copy text',
  description:
    'The text that a copy of a chip gives, such as its mention `@src/app/checkout/useAddressAutocomplete.ts`. It shows only while a copy of chat text runs, when the chips show it in place of their look, so the copy of the browser gives that text. A screen reader never reads it. A view draws no copy, so its own page shows nothing.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      /** The text that a copy gives. Without it, the part draws nothing. */
      text: { type: 'string' },
    },
  } as const,
  props: { text: '@src/app/checkout/useAddressAutocomplete.ts' },
  render: (props) => <ChipCopyText text={props.text} />,
})
