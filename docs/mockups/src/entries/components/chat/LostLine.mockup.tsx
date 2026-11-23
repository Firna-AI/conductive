import { defineComponent } from '@mokly/mokly'
import { LostLine } from '../../../../../../src/ui/components/chat/LostLine'
import { lostReasons, lostWhats } from './chatKeys'

/**
 * The line of a runner event that the workspace refused, registered with
 * Mokly. The app draws the same line, so mockup-only parts render the
 * wrapper.
 */
export const lostLine = defineComponent({
  slug: 'lost-line',
  title: 'Lost line',
  description:
    'The line of a runner event that the workspace refused, at the place of the event: it names the lost data and why, and shows none of it. The chat centres it, and among the steps of an open fold it starts at the left edge. Its own page shows a tool update that was too large.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['what', 'reason'],
    properties: {
      what: { enum: lostWhats },
      reason: { enum: lostReasons },
      /** The left edge, as a step of an open fold. */
      align: { enum: ['center', 'start'] },
    },
  } as const,
  props: { what: 'tool-update', reason: 'too_large' },
  render: (props) => (
    <LostLine align={props.align} reason={props.reason} what={props.what} />
  ),
  variants: [
    {
      slug: 'in-fold',
      title: 'In a fold',
      description:
        'A part of a reply that was not valid, as a step of an open fold.',
      props: { what: 'reply-part', reason: 'invalid', align: 'start' },
    },
  ],
})
