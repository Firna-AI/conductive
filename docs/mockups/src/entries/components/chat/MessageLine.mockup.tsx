import { defineComponent } from '@mokly/mokly'
import { MessageLine } from '../../../components/chat/MessageLine'
import {
  bullets,
  code,
  heading,
  item,
  numbered,
  p,
  table,
} from '../../../fixtures/agentText'
import { agentItemSchema } from './chatItemSchemas'

/** A plan with a table, as the agent wrote it during a turn. */
const plan = {
  kind: 'agent',
  id: 'plan',
  blocks: [
    p('The plan, in this order:'),
    bullets(
      item('Add the debounce to ', code('useAddressAutocomplete'), '.'),
      item('Cover it with a test.'),
    ),
    table(
      [null, 'right'],
      ['Step', 'Time'],
      [
        ['Debounce', '10 min'],
        ['Test', '5 min'],
      ],
    ),
    p('Then I run the checkout tests.'),
  ],
} as const

const propSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'open'],
  properties: {
    message: agentItemSchema,
    /** The line is open to the full message. */
    open: { type: 'boolean' },
  },
} as const

type Props = Parameters<typeof MessageLine>[0]

/**
 * A message of the agent in an open fold, registered with Mokly. Its
 * pages show the closed line and the open message.
 */
export const messageLine = defineComponent<typeof propSchema, [], Props>({
  slug: 'message-line',
  title: 'Message line',
  description:
    'A message of the agent in an open fold: an icon and the first words of the message on one line, cut with an ellipsis. A click opens the line to the full text, with its paragraphs, headings, lists, and tables. The closed line shows a table and all that follows it as text. When the message opens, the table and the rest show under the line. Its own page shows the closed line of a plan with a table.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema,
  props: { message: plan, open: false },
  render: (props) => <MessageLine message={props.message} open={props.open} />,
  variants: [
    {
      slug: 'open',
      title: 'Open',
      description:
        'The open message: the line keeps the blocks before the table, and the rest shows under it.',
      props: { open: true },
    },
    {
      slug: 'headings',
      title: 'Headings and numbers',
      description:
        'An open message with a heading and a numbered list, whose items write their numbers.',
      props: {
        open: true,
        message: {
          kind: 'agent',
          id: 'review',
          blocks: [
            heading(2, 'Needs your answer'),
            numbered(
              item('Wait 250 ms after the last key press.'),
              item('Keep the last 50 queries in the proxy.'),
            ),
          ],
        },
      },
    },
  ],
})
