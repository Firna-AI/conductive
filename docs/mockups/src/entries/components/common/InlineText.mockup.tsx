import { defineComponent } from '@mokly/mokly'
import { InlineText } from '../../../../../../src/ui/components/common/InlineText'

/**
 * Text with each part in backticks as inline code, registered with Mokly.
 */
export const inlineText = defineComponent({
  slug: 'inline-text',
  title: 'Inline text',
  description:
    'Text with each part in backticks as inline code, as the file preview and the dialogs show it. Its own page shows a sentence with an invite code.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: {
      /** The text, with each part of inline code in backticks. */
      text: { type: 'string' },
    },
  } as const,
  props: { text: 'Invite code `CND-7Q2K` stops working at once.' },
  render: (props) => <InlineText text={props.text} />,
})
