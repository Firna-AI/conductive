import { defineComponent } from '@mokly/mokly'
import type {
  TextBlock,
  TextTable,
} from '../../../../../../src/chat/markdown/agent-blocks'
import { AgentBlocks } from '../../../../../../src/ui/components/chat/AgentBlocks'
import { fixtureDrawing } from '../../../components/chat/fixtureDrawing'
import {
  bullets,
  code,
  codeBlock,
  heading,
  item,
  numbered,
  p,
  strong,
  table,
  under,
} from '../../../fixtures/agentText'
import { markdownTable } from '../common/MarkdownTable.mockup'
import { agentBlocksSchema } from './chatBlockSchemas'

const propSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'blocks'],
  properties: {
    id: { type: 'string', minLength: 1 },
    blocks: agentBlocksSchema,
  },
} as const

type Props = { id: string; blocks: readonly TextBlock[] }

function tableCount(blocks: readonly TextBlock[]): number {
  let count = 0
  for (const block of blocks) {
    if (block.kind === 'table') count += 1
    if (block.kind === 'quote') count += tableCount(block.blocks)
    if (block.kind === 'ol' || block.kind === 'ul') {
      for (const item of block.items) count += tableCount(item.blocks)
    }
  }
  return count
}

function RegisteredBlocks({ blocks, id }: Props) {
  // A single table can keep its name when it moves within the message.
  const drawing =
    tableCount(blocks) === 1
      ? {
          ...fixtureDrawing,
          table: (block: TextTable) => (
            <markdownTable.Component
              align={block.align}
              head={block.head}
              moklyInstance={`table-${id}`}
              rows={block.rows}
            />
          ),
        }
      : fixtureDrawing
  return <AgentBlocks blocks={blocks} drawing={drawing} />
}

/** The blocks of a message of the agent, registered with Mokly. */
export const agentBlocks = defineComponent<typeof propSchema, [], Props>({
  slug: 'agent-blocks',
  title: 'Agent blocks',
  description:
    'The blocks of a message of the agent, in order: paragraphs, headings, tables, lists, code blocks, quotes, and rules. Text keeps its inline code, bold text, emphasis, strikethrough, and line breaks. A workspace link or file mention shows as a chip. A list item can hold more blocks, and a task item shows its check box. A paragraph or list item can show a picture. A heading or table cell shows its link. The element around the blocks sets their type and spacing. Its own page shows the answer of a finished turn.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema,
  props: {
    id: 'done',
    blocks: [
      p('Done. Checkout now suggests addresses as you type.'),
      bullets(
        item('Choosing a suggestion fills the street, city, and postcode.'),
        item(
          'Unit tests cover ',
          code('useAddressAutocomplete'),
          ', and the checkout end-to-end tests pass.',
        ),
      ),
    ],
  },
  render: (props) => <RegisteredBlocks {...props} />,
  variants: [
    {
      slug: 'headings',
      title: 'Headings',
      description: 'A review with headings at three levels.',
      props: {
        id: 'review',
        blocks: [
          heading(1, 'Review of #482'),
          p('The suggestions work, and the unit and end-to-end tests pass.'),
          heading(2, 'Needs your answer'),
          heading(3, '1. Lookups can pass the rate limit'),
          p(strong('Severity:'), ' Medium. ', strong('Effort:'), ' Small.'),
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
          p('The autocomplete adds 6.1 kB to the checkout bundle.'),
          table(
            [null, 'right', 'right'],
            ['Bundle', 'Before', 'After'],
            [
              [code('checkout'), '182.4 kB', '188.5 kB'],
              [code('cart'), '96.0 kB', '96.0 kB'],
            ],
          ),
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
          numbered(
            under(
              item('Provider (medium effort).'),
              bullets(
                item('a. Keep the places proxy.'),
                item('b. Move to the hosted widget.'),
              ),
            ),
            under(
              item('Manual fields (small effort).'),
              bullets(
                item('a. Keep them as a fallback.'),
                item('b. Hide them.'),
              ),
            ),
          ),
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
          p('I took the screenshot with:'),
          codeBlock(
            'npx playwright screenshot --device="iPhone 13" http://localhost:3000/checkout .context/shots/after.png',
          ),
        ],
      },
    },
  ],
})
