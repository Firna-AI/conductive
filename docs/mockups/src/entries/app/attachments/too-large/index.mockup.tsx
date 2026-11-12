import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const attachmentsTooLarge = defineScreen({
  title: 'File over 25 MB',
  description:
    'The user also chose a screen recording over 25 MB. The composer does not attach the recording, and it does not upload, so the text gets no chip for it. The notice over the composer names the file and says that each file can be up to 25 MB. "Attach a smaller file" opens the file picker. The screenshot and the log keep their chips, and Send takes the message with them.',
  rationale:
    'Decision 132 limits each file to 25 MB. The app checks the size before the upload, so the user does not wait for an upload that the app refuses. The recording is not part of the message, so it has no chip, and Send stays on. The title names what failed, and the body gives the limit. The notice gives no size of the file: the app shows sizes in units of 1024, and the limit of 25,000,000 bytes counts in units of 1000, so the two numbers could disagree. Moved here from a saved state of the Attachments page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'too-large' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
