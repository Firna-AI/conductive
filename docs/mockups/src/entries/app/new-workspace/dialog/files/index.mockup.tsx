import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogFiles = defineScreen({
  title: 'Uploading files',
  description:
    'The task is written, and the user attached a sketch and some notes. The sketch uploads, and its ring and "35%" show the share that the browser sent. The notes wait for their turn, with the spinner and "Uploading". Create is off until both are uploaded. Remove takes a file off the message.',
  rationale:
    'The dialog uses the chips and the rules of the New workspace page, as app/new-workspace/files shows. So a failed upload shows Try again. A file over 25 MB gets its notice with the other notices of the dialog, as app/attachments/too-large shows in a session. Moved here from a saved state of the dialog page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message', files: 'uploading' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})
