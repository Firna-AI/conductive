import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const chatTablesRows = defineScreen({
  title: 'After the table appears',
  description:
    'The separator row arrived, so the text became a table. It shows the rows that have arrived, and the row that the agent writes grows in its cells. The finished reply shows the same table, as the first screen of this page does.',
  rationale:
    'Moved here from a saved state of Tables in replies, with the same path, so that page shows only its canonical screen. Each update draws the table again from the text so far. So a tab that opens later, and reads the saved reply, shows the same table as a tab that saw each part arrive.',
  relatedDocs: [
    'docs/protocol/chat-tables.md',
    'docs/protocol/chat-markdown.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'table-rows',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
