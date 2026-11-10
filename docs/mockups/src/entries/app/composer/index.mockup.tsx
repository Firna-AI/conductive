import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const composer = defineScreen({
  title: 'Composer',
  description:
    'A message with two uploaded files. The paperclip uploads files, which show as chips above the text, and Send takes the message with its files. Each file shows its icon in a cell at its start, which a pointer turns into a × that removes the file, as `app/file-mentions/chips/attached-file` shows. The Attachments page shows an upload that runs or fails, a file over the size limit, and sent files. One picker sets the model and the effort of the next message, such as "Opus 5.5 High". The user started the session, so the bar names no login. The child pages show the open picker, a missing agent, the login of another member, a login that is not shared, and a login on an own endpoint.',
  rationale:
    'The picker names the model and shows the effort in a muted colour, without the names of the agents, so it stays short. The app offers the Claude and Codex models only for now. Each session has its own picker, as the user chose in decision 19. The app stores each file until the turn starts, then copies it into the cloud computer, and an image also goes to the model. Every composer uses the same controls, also the one of a new workspace.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'attachments' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
