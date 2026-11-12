import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const attachmentsQueued = defineScreen({
  title: 'Files of a first message',
  description:
    'The first message of a new workspace carries a sketch and some notes, each as a chip at its place in the text. The sandbox starts for the first time, and the message waits until the sandbox is ready. Until the message goes out to the agent, a press on a chip opens nothing.',
  rationale:
    'A new workspace has no cloud computer when the user uploads, so the app stores the files. When the turn of the message starts, the app copies them into the cloud computer. The copy comes with the turn, so a chip of a message that waits has no file to open yet. Moved here from a saved state of the Attachments page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued-files',
    banner: 'no-commits',
    composer: 'empty',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
