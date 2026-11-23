import { defineComponent } from '@mokly/mokly'
import { StopLine } from '../../../../../../src/ui/components/chat/StopLine'
import { memberStopped } from '../../../../../../src/ui/components/chat/stopCopy'
import { standardSpeedText } from '../../../../../../src/ui/components/chat/speedCopy'
import { unlistedFiles } from '../../../../../../src/ui/components/chat/lostCopy'
import { sessionChip } from './SessionChip.mockup'

/**
 * The line of a stopped turn, registered with Mokly. A stop from a session
 * takes the chip of that session in the `chip` slot.
 */
export const stopLine = defineComponent({
  slug: 'stop-line',
  title: 'Stop line',
  description:
    'The line of a stopped turn: the stop icon, who stopped the turn, then each note of the turn after a dot, such as the files that it does not list. A stop from a session shows "Stopped from" and the chip of that session. The chat centres the line, and a narrow chat wraps it into balanced lines. Its own page shows a turn that the reader stopped.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['source', 'notes'],
    properties: {
      /** Who stopped the turn: words, or the session in the `chip` slot. */
      source: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['kind', 'text'],
            properties: { kind: { const: 'words' }, text: { type: 'string' } },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['kind'],
            properties: { kind: { const: 'session' } },
          },
        ],
      },
      /** The notes of the turn, each after a dot. */
      notes: { type: 'array', items: { type: 'string' } },
    },
  } as const,
  slots: ['chip'],
  props: { source: { kind: 'words', text: memberStopped('You') }, notes: [] },
  render: (props) => (
    <StopLine
      notes={props.notes}
      source={
        props.source.kind === 'words'
          ? props.source
          : { kind: 'session', chip: props.chip }
      }
    />
  ),
  variants: [
    {
      slug: 'notes',
      title: 'Notes',
      description:
        'A fast turn that ran at standard speed, with changed files past the list.',
      props: {
        notes: [standardSpeedText('fast_limit'), unlistedFiles(5)],
      },
    },
    {
      slug: 'from-session',
      title: 'From a session',
      description:
        'The agent of another session stopped the turn with a workspace tool.',
      props: { source: { kind: 'session' } },
      slots: {
        chip: (
          <sessionChip.Component
            moklyInstance="stop-session"
            session={{
              workspace: { label: 'W-395', status: 'ready', github: null },
              title: 'Review the checkout flow',
            }}
          />
        ),
      },
    },
  ],
})
