import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const attachmentsSent = defineScreen({
  title: 'Sent files',
  description:
    "The message went with its two files. Each file shows as a chip at its place in the text: the icon of its kind, its name, and its size in a muted colour. A press on the chip of the screenshot opens the file tab of its copy in the cloud computer. Nothing shows under the message, because the text shows both files. The turn runs, and the agent's first answer says what the screenshot shows.",
  rationale:
    'The user chose option D of decision 262 on 10 November 2026: the text keeps `@` and the copy path of each file at its place, and the path comes from the file ID only. So the agent reads each path where the member put the file, and Try again sends the same text. The chip finds its file of the message by that path, and shows the original name, not the path. The user chose option B of decision 264: a press on a sent chip opens the file tab of the copy, as a press on a file chip opens its file. The app copied the files into the cloud computer when the turn started. Moved here from a saved state of the Attachments page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'sent-files', composer: 'empty' },
  useCasePaths: ['user-flows/drop-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'listed',
      title: 'Files without a place',
      description:
        'A message from before files had a place in the text. Its text holds no mention of its files, so they show under the message, at the right, with their sizes. A file of a message that its text does not show always shows there.',
      rationale:
        'Each file of a sent message stays in view, so each member sees what the agent got. The files under the message keep their look from before files had a place in the text.',
      props: { conversation: 'sent-files-listed' },
    },
  ],
})
