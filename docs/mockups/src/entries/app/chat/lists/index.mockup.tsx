import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatLists = defineScreen({
  title: 'Lists in replies',
  description:
    'The agent answers with a numbered list of two choices. Under each choice, the agent indented its lettered options, so they show as a bulleted list inside the item of the choice, under its text. The numbers count from the first item, and both kinds of list have the same indent.',
  rationale:
    'The user chose on 10 November 2026 that the chat nests a list under its item, with the list rules of the file preview, as GitHub does. Before, the options showed as a separate list after each choice, at the level of the choices, and the numbers started again at 1 after each list of options.',
  relatedDocs: ['docs/protocol/chat-markdown.md'],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'nested-lists' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'work',
      title: 'In the work of a turn',
      description:
        'The user opened the folded work of a finished turn, and its last message. The message holds a numbered plan with steps under each item. The open line shows each list under the text of its item, as an answer does, and the closed line shows the plan as one line of text.',
      rationale:
        'A message in the work of a turn keeps the formatting of an answer when it opens, so a plan reads the same in both places. The open line draws its lists as spans, because a summary holds only phrasing content.',
      props: { conversation: 'nested-lists-in-work', fold: 'open-message' },
    },
  ],
})
