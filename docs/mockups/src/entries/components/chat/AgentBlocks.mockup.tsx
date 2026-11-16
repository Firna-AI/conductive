import { defineComponent } from '@mokly/mokly'
import { AgentBlocks } from '../../../components/chat/AgentBlocks'
import { bullets } from '../../../fixtures/listConversations'
import { agentBlockSchema } from './chatBlockSchemas'

/**
 * The blocks of a message of the agent, registered with Mokly. Its pages
 * show paragraphs with a list, headings, a table, a list with lists under
 * its items, and a code block.
 */
export const agentBlocks = defineComponent({
  slug: 'agent-blocks',
  title: 'Agent blocks',
  description:
    'The blocks of a message of the agent, in order: its paragraphs, its headings, its tables, its lists, and its code blocks. Their text keeps its inline code and its bold, and each link to a workspace of the org is a chip. Each mention, and each inline code whose whole text is a path of the tree, is a file chip. A code block stays code. A list shows the lists that the agent indents under its items. The element around them sets the type and the space between them. Its own page shows the answer of a finished turn.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'blocks'],
    properties: {
      /** The ID of the message, which names its table for Mokly. */
      id: { type: 'string', minLength: 1 },
      blocks: { type: 'array', items: agentBlockSchema },
    },
  } as const,
  props: {
    id: 'done',
    blocks: [
      'Done. Checkout now suggests addresses as you type.',
      bullets(
        'Choosing a suggestion fills the street, city, and postcode.',
        'Unit tests cover `useAddressAutocomplete`, and the checkout end-to-end tests pass.',
      ),
    ],
  },
  render: (props) => <AgentBlocks blocks={props.blocks} id={props.id} />,
  variants: [
    {
      slug: 'headings',
      title: 'Headings',
      description: 'A review with headings at three levels.',
      props: {
        id: 'review',
        blocks: [
          { kind: 'heading', level: 1, text: 'Review of #482' },
          'The suggestions work, and the unit and end-to-end tests pass.',
          { kind: 'heading', level: 2, text: 'Needs your answer' },
          {
            kind: 'heading',
            level: 3,
            text: '1. Lookups can pass the rate limit',
          },
          '**Severity:** Medium. **Effort:** Small.',
        ],
      },
    },
    {
      slug: 'table',
      title: 'Table',
      description:
        'An answer with a table, with a column aligned to the right.',
      props: {
        id: 'bundles',
        blocks: [
          'The autocomplete adds 6.1 kB to the checkout bundle.',
          {
            kind: 'table',
            head: ['Bundle', 'Before', 'After'],
            rows: [
              ['`checkout`', '182.4 kB', '188.5 kB'],
              ['`cart`', '96.0 kB', '96.0 kB'],
            ],
            align: [null, 'right', 'right'],
          },
        ],
      },
    },
    {
      slug: 'nested-lists',
      title: 'Lists under items',
      description:
        'A numbered list with the lettered options of each choice under it.',
      props: {
        id: 'choices',
        blocks: [
          {
            kind: 'list',
            numbered: true,
            items: [
              {
                text: 'Provider (medium effort).',
                list: bullets(
                  'a. Keep the places proxy.',
                  'b. Move to the hosted widget.',
                ),
              },
              {
                text: 'Manual fields (small effort).',
                list: bullets('a. Keep them as a fallback.', 'b. Hide them.'),
              },
            ],
          },
        ],
      },
    },
    {
      slug: 'code',
      title: 'Code block',
      description:
        'An answer with a code block, which keeps its text and its paths as code.',
      props: {
        id: 'screenshot',
        blocks: [
          'I took the screenshot with:',
          {
            kind: 'code',
            text: 'npx playwright screenshot --device="iPhone 13" http://localhost:3000/checkout .context/shots/after.png',
          },
        ],
      },
    },
  ],
})
