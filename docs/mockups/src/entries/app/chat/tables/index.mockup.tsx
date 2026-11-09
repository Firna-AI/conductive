import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatTables = defineScreen({
  title: 'Tables in replies',
  description:
    'The agent answers with a table between two paragraphs: the resources of its cloud computer. The table has a header row on a raised fill and one thin line between cells, as in the Markdown preview of a file. A cell keeps its inline code, such as `/home`. The text before and after the table keeps the width of the chat.',
  rationale:
    'The user chose on 9 November 2026 that the chat adds tables to the formatting that it already has, and shares the table of the file preview, with the same look. Before, the chat joined the rows of a table into one paragraph of pipes. The chat shows a table as a native table, so a screen reader reads its rows and columns.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'table-resources',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'short-row',
      title: 'Short row',
      description:
        'The last row of the table has two cells under a header of four, because the bundle runs on the server. Its last cell spans the missing columns, so the row keeps its lines, and its text starts where its own column starts. The three number columns align to the right.',
      rationale:
        'The user chose on 9 November 2026 that the last cell of a short row spans the missing columns, with no empty cells. So the cells of a table stay in proportion to the text of the reply. A cell that spans keeps its text at its start, also in a column that aligns to the right or to the centre, so the text never stands under a column that it does not belong to.',
      props: { conversation: 'table-short-row' },
    },
    {
      slug: 'wide',
      title: 'Wide table',
      description:
        'A table of ten columns is wider than the chat. It scrolls sideways inside the reply, and the paragraphs before and after it keep the width of the chat. A phone shows the first columns, and a swipe shows the rest.',
      rationale:
        'A table never makes the chat or the workspace wider than the window. The table keeps the columns as the agent wrote them, so a reader can compare the rows.',
      props: { conversation: 'table-wide' },
    },
    {
      slug: 'header',
      title: 'Before the separator row',
      description:
        'The agent writes the answer. The header row of the table has arrived, and its separator row has not. So the header row shows as the text that the agent wrote, with its pipes, and the agent keeps working.',
      rationale:
        'The chat shows each part of a reply as soon as it arrives. A row of pipes becomes a table only when a separator row with as many cells follows it, so text that is not a table stays as the agent wrote it.',
      props: { conversation: 'table-header' },
    },
    {
      slug: 'rows',
      title: 'After the table appears',
      description:
        'The separator row arrived, so the text became a table. It shows the rows that have arrived, and the row that the agent writes grows in its cells. The finished reply shows the same table, as the first screen of this page does.',
      rationale:
        'Each update draws the table again from the text so far. So a tab that opens later, and reads the saved reply, shows the same table as a tab that saw each part arrive.',
      props: { conversation: 'table-rows' },
    },
  ],
})
