import { defineComponent } from '@mokly/mokly'
import type { CellAlign } from '../../../../../../src/markdown/table-rows'
import { MarkdownTable } from '../../../components/common/MarkdownTable'
import { MessageText } from '../../../components/chat/MessageText'
import { InlineText } from '../../../components/common/InlineText'

/** The alignments of a column, as `CellAlign` lists them. */
const alignments = [
  'left',
  'center',
  'right',
  null,
] as const satisfies readonly CellAlign[]

/**
 * How the cells of a table draw their text: with inline code, as the file
 * preview draws it, or as the text of a chat message.
 */
const cellRenderers = {
  'inline-code': (text: string) => <InlineText text={text} />,
  message: (text: string) => <MessageText answer text={text} />,
} as const

/**
 * A Markdown table as a native table, registered with Mokly. Its cells are
 * text, and `cells` names how they draw it, because a render function is
 * not data.
 */
export const markdownTable = defineComponent({
  slug: 'markdown-table',
  title: 'Markdown table',
  description:
    'A Markdown table as a native table, in the look that the replies of the chat and the file preview share. A table wider than its place scrolls sideways inside its box. Its own page shows a table of the file preview, with inline code.',
  relatedDocs: ['docs/mockups/design-chat.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['head', 'rows', 'align', 'cells'],
    properties: {
      /** The header row. Its cells set the columns of the table. */
      head: { type: 'array', items: { type: 'string' } },
      /** The body rows, each with the cells that it has. */
      rows: {
        type: 'array',
        items: { type: 'array', items: { type: 'string' } },
      },
      /** The alignment of each column. */
      align: { type: 'array', items: { enum: alignments } },
      /** How the cells draw their text. */
      cells: { enum: ['inline-code', 'message'] },
      /** A class of the call that places the box, such as a margin. */
      className: { type: 'string' },
    },
  } as const,
  props: {
    head: ['Command', 'What it does'],
    rows: [
      ['`npm test`', 'Runs the tests'],
      ['`npm run build`', 'Builds the app'],
    ],
    align: [null, null],
    cells: 'inline-code',
  },
  render: (props) => (
    <MarkdownTable
      align={props.align}
      className={props.className}
      head={props.head}
      renderCell={cellRenderers[props.cells]}
      rows={props.rows}
    />
  ),
  variants: [
    {
      slug: 'message',
      title: 'In a message',
      description:
        'A table in a reply of the chat, with a column aligned to the right.',
      props: {
        head: ['Check', 'Time'],
        rows: [
          ['Lint', '12 s'],
          ['Tests', '1 min 40 s'],
        ],
        align: ['left', 'right'],
        cells: 'message',
      },
    },
  ],
})
