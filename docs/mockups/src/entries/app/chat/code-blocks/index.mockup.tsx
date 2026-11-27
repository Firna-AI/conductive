import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatCodeBlocks = defineScreen({
  title: 'Code blocks in replies',
  description:
    'Cal asked how the guide of the places API keeps the token of a session. The agent answers with the example of the guide in a code block with the fence label rust. The block shows the colours of a Rust file tab: its keywords, types, string, and number have their code colours, and its comments are in italics. The requests of a session under it are in a code block without a label, so they stay plain text. No block shows the name of its language, and each block keeps its text as the agent wrote it. On a phone, each block has its Copy code button in its top corner.',
  rationale:
    'The user chose A of code colours decision 1 on 26 November 2026: a code block takes the colours of a file tab from its fence label, in the chat and in the Markdown preview of a file, so the same code looks the same in a reply and in a file tab. Not chosen: B, a library such as Prism, which adds 21.6 KB gzipped and looks different from a file tab. C and D, a guess of the language of a block without a label, which colours logs and command output wrongly. A block without a label, or with a label of no known language, stays plain, because wrong colours are worse than none. The colours are spans in the one block, with its line feeds, so Copy code copies the text exactly.',
  relatedDocs: ['docs/protocol/chat-markdown.md'],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'code-blocks' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
