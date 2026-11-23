import { defineComponent } from '@mokly/mokly'
import type { InlineText } from '../../../../../../src/chat/markdown/agent-inline'
import type {
  CellAlign,
  TableCells,
} from '../../../../../../src/markdown/table-rows'
import { MarkdownTable } from '../../../../../../src/ui/components/common/MarkdownTable'
import { AnswerText } from '../../../components/chat/AnswerText'
import { PreviewText } from '../../../components/files/PreviewText'
import { inline } from '../../../fixtures/agentText'
import { inlineTextSchema } from '../chat/chatBlockSchemas'

/** The alignments of a column, as `CellAlign` lists them. */
const alignments = [
  'left',
  'center',
  'right',
  null,
] as const satisfies readonly CellAlign[]

const cellSchema = { anyOf: [{ type: 'string' }, inlineTextSchema] } as const

const propSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['head', 'rows', 'align'],
  properties: {
    /** The header row. Its cells set the columns of the table. */
    head: { type: 'array', items: cellSchema },
    /** The body rows, each with the cells that it has. */
    rows: {
      type: 'array',
      items: { type: 'array', items: cellSchema },
    },
    /** The alignment of each column. */
    align: { type: 'array', items: { enum: alignments } },
    /** A class of the call that places the box, such as a margin. */
    className: { type: 'string' },
  },
} as const

type Props = TableCells<string | InlineText> & { className?: string }

function renderCell(text: string | InlineText) {
  return typeof text === 'string' ? (
    <PreviewText text={text} />
  ) : (
    <AnswerText text={text} />
  )
}

/**
 * A Markdown table as a native table, registered with Mokly. File previews
 * supply Markdown strings and chat fixtures supply inline text trees.
 */
export const markdownTable = defineComponent<typeof propSchema, [], Props>({
  slug: 'markdown-table',
  title: 'Markdown table',
  description:
    'A Markdown table as a native table, in the look that the replies of the chat and the file preview share. A table wider than its place scrolls sideways inside its box. Its own page shows a table of the file preview, with inline code.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema,
  props: {
    head: ['Command', 'What it does'],
    rows: [
      ['`npm test`', 'Runs the tests'],
      ['`npm run build`', 'Builds the app'],
    ],
    align: [null, null],
  },
  render: (props) => <MarkdownTable {...props} renderCell={renderCell} />,
  variants: [
    {
      slug: 'message',
      title: 'In a message',
      description:
        'A table in a reply of the chat, with a column aligned to the right.',
      props: {
        head: [inline('Check'), inline('Time')],
        rows: [
          [inline('Lint'), inline('12 s')],
          [inline('Tests'), inline('1 min 40 s')],
        ],
        align: ['left', 'right'],
      },
    },
  ],
})
