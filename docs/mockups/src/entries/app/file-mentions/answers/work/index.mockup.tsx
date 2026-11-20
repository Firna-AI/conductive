import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const fileMentionAnswersWork = defineScreen({
  title: 'In the work of a turn',
  description:
    'Cal opened the folded work of a finished turn, and its last message. The first message is closed, so its line shows the Markdown image of the screenshot before the fix as the link Postcode field before the fix, and the line stays one line. The open message shows the screenshot after the fix as its picture, as an answer does. A press on the picture or on the link opens the file tab, and the line stays open or closed.',
  rationale:
    'A design call of 18 November 2026 says that a picture shows in the text of each message of the agent. A closed line stays one line, so the steps of the work stay close together, and a picture would break that line, as it breaks a heading. So the closed line keeps the link, and the open line shows the picture, as it shows the look of a code block.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'file-answer-in-work',
    fold: 'open-message',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
