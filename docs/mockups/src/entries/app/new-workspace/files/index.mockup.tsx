import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const files = defineScreen({
  title: 'Uploading files',
  description:
    'The user attaches two files to the first message of a new workspace. The workspace and its cloud computer do not exist yet. The sketch uploads, and its ring and "35%" show the share that the browser sent. The notes wait for their turn, with the spinner and "Uploading". Send waits until both are uploaded. Remove takes a file off the message.',
  rationale:
    'The user chose option A of decision 132 on 8 November 2026. The app stores each upload until the turn of its message starts, so the first message can carry files before the workspace has a cloud computer. This composer uses the same chips and rules as a session, as the Attachments page shows, also for a failed upload and a file over 25 MB.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, files: 'uploading' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'ready',
      title: 'Files uploaded',
      description:
        'Both files are uploaded, so Send is on. Send creates the workspace, and the first message waits with its files while the sandbox starts.',
      rationale:
        'The files stay with the message while the workspace starts. When the turn starts, the app copies them into the cloud computer.',
      props: { files: 'ready' },
    },
  ],
})
