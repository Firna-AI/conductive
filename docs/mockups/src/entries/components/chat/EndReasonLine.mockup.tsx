import { defineComponent } from '@mokly/mokly'
import { EndReasonLine } from '../../../../../../src/ui/components/chat/EndReasonLine'
import { turnEndReasons } from './chatKeys'

/**
 * The line of the end reason of a finished turn, registered with Mokly.
 * The app draws the same line, so mockup-only parts render the wrapper.
 */
export const endReasonLine = defineComponent({
  slug: 'end-reason-line',
  title: 'End reason line',
  description:
    'The line of a cause other than the end of the reply that finished a turn, such as the time limit of background work. It is centred and muted, as the other event lines of the chat, and a narrow chat wraps it into balanced lines.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['reason'],
    properties: { reason: { enum: turnEndReasons } },
  } as const,
  props: { reason: 'background_work_limit' },
  render: (props) => <EndReasonLine reason={props.reason} />,
})
