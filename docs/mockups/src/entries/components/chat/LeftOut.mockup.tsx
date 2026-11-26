import { defineComponent } from '@mokly/mokly'
import { LeftOut } from '../../../../../../src/ui/components/chat/LeftOut'
import { leftOutOfCall } from '../../../../../../src/ui/components/chat/lostCopy'

/**
 * The output that the runner left out of a tool, registered with Mokly.
 * The app draws the same note, so mockup-only parts render the wrapper.
 */
export const leftOut = defineComponent({
  slug: 'left-out',
  title: 'Left out',
  description:
    'The output that the runner left out of the detail of a tool call: scissors and a short text, such as "1.2 MB left out". A tool call and the line of a fold show it.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: { text: { type: 'string' } },
  } as const,
  props: { text: leftOutOfCall(1_258_291) },
  render: (props) => <LeftOut text={props.text} />,
})
