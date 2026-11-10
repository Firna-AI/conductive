import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogLink = defineScreen({
  title: 'Workspace link',
  description:
    'The task names an earlier workspace. Cal pasted the link of Checkout address autocomplete, the workspace under the dialog, and the message shows it as a chip at once, with the ready state that the list shows. Create is on.',
  rationale:
    'The dialog turns a pasted link into a chip, as the message boxes of the New workspace page and of the chat do, from decision 211. The chip finds its workspace in the list of the screen, as the chat does. The first message keeps the plain link. Moved here from a saved state of the dialog page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'workspace-link' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})
