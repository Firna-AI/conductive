import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const attachmentsFailed = defineScreen({
  title: 'Failed upload',
  description:
    'The upload of the screenshot failed. Its chip in the text has a rose fill and border, an alert icon, and "Failed" in place of its size. Try again in the chip uploads the same file again, and the removal of the chip takes the file off the message. Send waits until the user does one of the two. The log stays uploaded.',
  rationale:
    'A failed file stays at its place in the message, so the user sees which file failed and decides what to do. Send never drops a file without a word, so no failure loses a file of the message. Try again takes the keyboard focus, because Backspace removes the chip but cannot upload it again. The state tints the whole chip, and its edges have no accent strip. Moved here from a saved state of the Attachments page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'upload-failed' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
