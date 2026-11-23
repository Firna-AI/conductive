import { defineComponent } from '@mokly/mokly'
import { StandardSpeedNote } from '../../../../../../src/ui/components/chat/StandardSpeedNote'
import { speedCauses } from './chatKeys'

/**
 * The note of a fast turn that ran at standard speed, registered with
 * Mokly. The app draws the same note, so mockup-only parts render the
 * wrapper.
 */
export const standardSpeedNote = defineComponent({
  slug: 'standard-speed-note',
  title: 'Standard speed note',
  description:
    'The note of a fast turn that ran at standard speed, in the end line of the turn: muted text with a gauge icon, with the cause when the app knows it. A narrow chat wraps it. Its own page shows the note without a cause.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: { cause: { enum: speedCauses } },
  } as const,
  render: (props) => <StandardSpeedNote cause={props.cause} />,
  variants: [
    {
      slug: 'fast-limit',
      title: 'Fast limit',
      description: 'The turn reached the limit of fast mode.',
      props: { cause: 'fast_limit' },
    },
  ],
})
