import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogNoLogin = defineScreen({
  title: 'Agent not connected',
  description:
    'The task is written, with a sketch and some notes that are uploaded, and Claude is not connected. The notice above the footer asks to connect Claude to use Opus 5.5, and Create is off. Connect Claude closes the dialog and opens the account with the Connect form of Claude. The message and its files stay.',
  rationale:
    'The dialog shows the notices of the page. An action that opens another page closes the dialog first. The page and the dialog share the draft of the org and the section, so no close loses the message. Moved here from a saved state of the dialog page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message', files: 'ready', login: 'missing' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})
