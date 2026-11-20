import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatLists = defineScreen({
  title: 'Lists in replies',
  description:
    'The agent answers with a numbered list of two choices. Under each choice, the agent indented its lettered options, so they show as a bulleted list inside the item of the choice, under its text. The numbers count from the first item, and both kinds of list have the same indent. The variants show the work of a turn, and task lists in an answer and in the work of a turn.',
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
        'A message in the work of a turn keeps the formatting of an answer when it opens, so a plan reads the same in both places. The open line draws its lists as spans, because HTML allows no list in a summary.',
      props: { conversation: 'nested-lists-in-work', fold: 'open-message' },
    },
    {
      slug: 'tasks',
      title: 'Task lists',
      description:
        'Cal asked the agent to make the two changes of the review of Priya and push them. The answer lists the work as a task list, where the agent wrote - [x] and - [ ]. Each task has a fixed check box in the place of its bullet: checked for the two changes that the agent pushed, and empty for the approval of Priya. The approval has a note in a list under it, and its box stays on the line of its words. A press on a box changes nothing. The Markdown preview of a file draws the same boxes, as app/files/markdown shows.',
      rationale:
        'The user chose B of item 14 of the Markdown plan on 18 November 2026: the chat draws a task box as a fixed check box, as the file preview does. Not chosen: A, keep the box as text. Agents write task lists to show their progress, and the box shows the state of each task at a glance. The box is a disabled check box in the look of the design, because the text of the agent is the record: a reader cannot tick a task. The user chose B of item 82 on 20 November 2026: a done box has the ink fill and a check in the colour of the page, so it reads well in both schemes.',
      props: { conversation: 'task-lists' },
    },
    {
      slug: 'tasks-work',
      title: 'Task lists in the work of a turn',
      description:
        'The user opened the folded work of the same turn, and its last message. The first two messages are closed, so each stays one line, with each box before the words of its task: two empty boxes, then a checked box and an empty box. The open message shows its task list as an answer does, with a box in the place of each bullet: two changes checked, and the push still empty.',
      rationale:
        'A closed message stays one line, so its boxes stand in the line and keep the state of each task in view. Open, a task list shows as in an answer. A press on a box opens or closes the line, as a press on its words does.',
      props: { conversation: 'task-lists', fold: 'open-message' },
    },
  ],
})
