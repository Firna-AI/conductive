import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatHeadings = defineScreen({
  title: 'Headings in replies',
  description:
    'The agent answers with a review that ends with two choices. Each heading shows at the level that the agent wrote: the title at level 1 with a line under it, Needs your answer at level 2, a heading for each choice at level 3, and How I checked at level 4. The headings have the size, the weight, and the colour of the headings in the Markdown preview of a file. A heading stands a little further from the block above it than two paragraphs do. Under each choice, its fields keep their bold labels.',
  rationale:
    'The user chose on 11 November 2026 that the chat draws real headings at all six levels, with the look of the headings of the file preview. Before, the chat showed each heading as the text of a paragraph, so the sections of a long answer looked like the text around them. Each heading is a heading of its level, so a screen reader can move from section to section. The chat and the file preview share one heading style, so the two views keep the same look.',
  relatedDocs: ['docs/protocol/chat-markdown.md'],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'headings' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'work',
      title: 'In the work of a turn',
      description:
        'The user opened the folded work of a finished turn, and its last message. The first message is closed, and its line starts with the text of its heading, Plan, in the weight of a heading, so the words after it read as new text. The open message shows its heading, Test results, on its own line in the weight of a heading, between its first paragraph and its list.',
      rationale:
        'A closed message stays one line, so the steps of the work stay close together, also when a message starts with a heading. The open line shows each heading in the weight of a heading, in the size of the text of the line, so the work stays quieter than the answer. A summary may hold a heading, but its button role hides the heading from the heading list of a screen reader, so the line draws each heading as text.',
      props: { conversation: 'headings-in-work', fold: 'open-message' },
    },
  ],
})
