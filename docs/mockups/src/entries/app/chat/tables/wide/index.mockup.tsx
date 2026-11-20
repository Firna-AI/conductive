import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const chatTablesWide = defineScreen({
  title: 'Wide table',
  description:
    'A table of ten columns is wider than the chat. It scrolls sideways inside the reply, and the paragraphs before and after it keep the width of the chat. A phone shows the first columns, and a swipe shows the rest.',
  rationale:
    'Moved here from a saved state of Tables in replies, with the same path, so that page shows only its canonical screen. A table never makes the chat or the workspace wider than the window. The table keeps the columns as the agent wrote them, so a reader can compare the rows.',
  relatedDocs: [
    'docs/protocol/chat-tables.md',
    'docs/protocol/chat-markdown.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'table-wide',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
