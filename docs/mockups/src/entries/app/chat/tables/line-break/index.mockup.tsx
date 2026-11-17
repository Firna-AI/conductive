import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const chatTablesLineBreak = defineScreen({
  title: 'Line breaks in cells',
  description:
    'The agent compares the two address providers in a table. Some cells hold two lines, where the agent wrote a line-break tag: <br>, <br/>, or <br />. Each tag draws a line break in its cell, and each row is as high as its highest cell. The Markdown preview of a file draws the same line breaks, as app/files/markdown shows.',
  rationale:
    'A row of a Markdown table cannot hold a line break, so agents write a line-break tag in a cell. On 16 November 2026, with item 1 of the Markdown plan, the user chose that <br>, <br/>, and <br />, in any letter case, draw a line break in the chat and in the file preview. Before, each tag showed as letters. Other HTML stays text.',
  relatedDocs: [
    'docs/protocol/chat-tables.md',
    'docs/protocol/chat-markdown.md',
  ],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'table-line-breaks',
    banner: 'checks-running',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
