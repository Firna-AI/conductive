import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const attachmentsTooLarge = defineScreen({
  title: 'File over 1 GB',
  description:
    'The user also chose a screen recording over 1 GB. The composer does not attach the recording, and it does not upload, so the text gets no chip for it. The notice over the composer names the file and says that each file can be up to 1 GB. "Attach a smaller file" opens the file picker. The screenshot and the log keep their chips, and Send takes the message with them.',
  rationale:
    'Each file can contain at most 1 GB, or 1,000,000,000 bytes. The user asked for this limit on 12 November 2026, and chose option C of large-upload decision 1 on the same day. The browser sends each file in parts, so a file can be larger than the 100 MB that one request can carry. The app checks the size before the upload, so the user does not wait for an upload that the app refuses. The recording is not part of the message, so it has no chip, and Send stays on. The title names what failed, and the body gives the limit. The notice gives no size of the file: the app shows sizes in units of 1024, and the limit of 1,000,000,000 bytes counts in units of 1000, so the two numbers could disagree. A file one byte over the limit shows as 953.7 MB. Moved here from a saved state of the Attachments page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'too-large' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
