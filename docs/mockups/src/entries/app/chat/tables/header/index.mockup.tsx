import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const chatTablesHeader = defineScreen({
  title: 'Before the separator row',
  description:
    'The agent writes the answer. The header row of the table has arrived, and its separator row has not. So the header row shows as the text that the agent wrote, with its pipes, and the agent keeps working.',
  rationale:
    'Moved here from a saved state of Tables in replies, with the same path, so that page shows only its canonical screen. The chat shows each part of a reply as soon as it arrives. A row of pipes becomes a table only when a separator row with as many cells follows it, so text that is not a table stays as the agent wrote it.',
  relatedDocs: [
    'docs/protocol/chat-tables.md',
    'docs/protocol/chat-markdown.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'table-header',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
