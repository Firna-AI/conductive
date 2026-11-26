import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const chatTablesShortRow = defineScreen({
  title: 'Short row',
  description:
    'The last row of the table has two cells under a header of four, because the bundle runs on the server. Its last cell spans the missing columns, so the row keeps its lines, and its text starts where its own column starts. The three number columns align to the right.',
  rationale:
    'Moved here from a saved state of Tables in replies, with the same path, so that page shows only its canonical screen. The user chose on 9 November 2026 that the last cell of a short row spans the missing columns, with no empty cells. So the cells of a table stay in proportion to the text of the reply. A cell that spans keeps its text at its start, also in a column that aligns to the right or to the centre, so the text never stands under a column that it does not belong to.',
  relatedDocs: [
    'docs/protocol/chat-tables.md',
    'docs/protocol/chat-markdown.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'table-short-row',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
