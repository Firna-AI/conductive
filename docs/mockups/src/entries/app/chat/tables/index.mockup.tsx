import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatTables = defineScreen({
  title: 'Tables in replies',
  description:
    'The agent answers with a table between two paragraphs: the resources of its cloud computer. The table has a header row on a raised fill and one thin line between cells, as in the Markdown preview of a file. A cell keeps its inline code, such as `/home`. The text before and after the table keeps the width of the chat. The child pages show a short row, a wide table, cells with line breaks, and the reply while the agent writes it, before and after its separator row arrives.',
  rationale:
    'The user chose on 9 November 2026 that the chat adds tables to the formatting that it already has, and shares the table of the file preview, with the same look. Before, the chat joined the rows of a table into one paragraph of pipes. The chat shows a table as a native table, so a screen reader reads its rows and columns.',
  relatedDocs: [
    'docs/protocol/chat-tables.md',
    'docs/protocol/chat-markdown.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'table-resources',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
