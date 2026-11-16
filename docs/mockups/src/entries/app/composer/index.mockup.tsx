import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const composer = defineScreen({
  title: 'Composer',
  description:
    'A message with two uploaded files in a sentence. Each file is a chip at its place in the text, with the icon of its kind, its name, and its size, so the text says what each file shows. The paperclip puts each picked file at the caret, or at the end, and a drop puts it at the place under the pointer. Send takes the message with its files. Each chip shows its icon in a cell at its start, which a pointer turns into a × that removes the file, as `app/file-mentions/chips/attached-file` shows. The Attachments page shows a drop, an upload that runs or fails, a file over the size limit, and sent files. One picker sets the model and the effort of the next message, such as "Opus 5.5 High". The user started the session, so the bar names no login.',
  rationale:
    'The picker names the model and shows the effort in a muted colour, without the names of the agents, so it stays short. The app offers the Claude and Codex models only for now. Each session has its own picker, as the user chose in decision 19. The user chose option A of decision 263 on 10 November 2026: a file from the paperclip goes into the text at the caret, as a dropped file does, and the row above the text is gone. The app stores each file until the turn starts, then copies it into the cloud computer, and an image also goes to the model. Every composer uses the same controls, also the one of a new workspace. The other states of the page are child pages, so this page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'attachments' },
  useCasePaths: ['user-flows/drop-a-file'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
