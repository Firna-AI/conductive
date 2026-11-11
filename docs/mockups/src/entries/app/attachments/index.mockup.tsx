import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const attachments = defineScreen({
  title: 'Attachments',
  description:
    'Files upload. The user attached a screenshot and a console log to a message. The screenshot uploads: a ring takes the place of its icon, and "64%" the place of its size, the share of the file that the browser sent. The log waits for its turn, so a spinner and "Uploading" show until the browser measures it. Send waits until both are uploaded. Remove takes a file off the message and stops its upload. The composer page shows the uploaded files.',
  rationale:
    'The user chose option A of decision 132 on 8 November 2026. The app stores each upload until the turn of its message starts, then copies the file into the cloud computer. So a file uploads also before a new workspace has a cloud computer, and while a stopped one starts. The browser sends each file in one request and measures the bytes that it sent, as decision 144 D chose. So the percent is real, and before the first measurement the chip shows the spinner of a working agent, not a made-up share. Send waits for every upload, so a message goes with all of its files. The chip keeps its shape in each state.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, composer: 'uploading' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Failed upload',
      description:
        'The upload of the screenshot failed. Its chip has a rose fill and border, an alert icon, and "Failed" in place of its size. Try again uploads the same file again, and Remove takes it off the message. Send waits until the user does one of the two. The log stays uploaded.',
      rationale:
        'A failed file stays in the message, so the user sees which file failed and decides what to do. Send never drops a file without a word, so no failure loses a file of the message. The state tints the whole chip, and its edges have no accent strip.',
      props: { composer: 'upload-failed' },
    },
    {
      slug: 'too-large',
      title: 'File over 25 MB',
      description:
        'The user also chose a screen recording over 25 MB. The composer does not attach the recording, and it does not upload. The notice over the composer names the file and says that each file can be up to 25 MB. "Attach a smaller file" opens the file picker. The screenshot and the log stay, and Send takes the message with them.',
      rationale:
        'Decision 132 limits each file to 25 MB. The app checks the size before the upload, so the user does not wait for an upload that the app refuses. The recording is not part of the message, so it has no chip, and Send stays on. The title names what failed, and the body gives the limit. The notice gives no size of the file: the app shows sizes in units of 1024, and the limit of 25,000,000 bytes counts in units of 1000, so the two numbers could disagree.',
      props: { composer: 'too-large' },
    },
    {
      slug: 'sent',
      title: 'Sent files',
      description:
        "The message went with its two files. They show under the message, at the right, with their sizes and no Remove. The turn runs, and the agent's first answer says what the screenshot shows.",
      rationale:
        'The files stay part of the sent message, so each member sees what the agent got. The app copied the files into the cloud computer when the turn started.',
      props: { conversation: 'sent-files', composer: 'empty' },
    },
    {
      slug: 'queued',
      title: 'Files of a first message',
      description:
        'The first message of a new workspace carries a sketch and some notes. Its files show under it. The sandbox starts for the first time, and the message waits until the sandbox is ready.',
      rationale:
        'A new workspace has no cloud computer when the user uploads, so the app stores the files. When the turn of the message starts, the app copies them into the cloud computer.',
      props: {
        workspace: 'saved-carts',
        sandbox: 'starting',
        conversation: 'queued-files',
        banner: 'no-commits',
        composer: 'empty',
      },
    },
  ],
})
