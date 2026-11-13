import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const attachments = defineScreen({
  title: 'Attachments',
  description:
    'A file uploads. Cal dropped a screenshot into the message, after "The screenshot", and the console log has its place later in the sentence. Each file is a chip in the text. The screenshot uploads: a ring takes the place of its icon, and "64%" the place of its size, the share of the file that the browser sent. The log is uploaded, so it shows its size. Send waits until the screenshot is uploaded. The removal of a chip takes its file off the message and stops its upload. The child pages show a drop, a failed upload, a file over 100 MB, the sent message, the file tab of a sent screenshot, and the files of a first message.',
  rationale:
    'The user chose option A of decision 132 on 8 November 2026. The app stores each upload until the turn of its message starts, then copies the file into the cloud computer. So a file uploads also before a new workspace has a cloud computer, and while a stopped one starts. The browser sends each file in one request and measures the bytes that it sent, as decision 144 D chose. So the percent is real. A file stands in the text where the member puts it, so the text can say where each file belongs. Send waits for every upload, so a message goes with all of its files. The chip keeps its shape in each state. The states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'uploading' },
  useCasePaths: ['user-flows/drop-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
