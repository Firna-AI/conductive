import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogNotCreated = defineScreen({
  title: 'Not created',
  description:
    'The create request did not reach the server. The dialog stays open with the message, and the notice says that the workspace was not created, with Try again.',
  rationale:
    'The dialog closes when the create succeeds, and the new workspace opens, as from the page. A first start that fails after that keeps the workspace with its queued message and Try again. So the dialog shows only a create request that failed. Moved here from a saved state of the dialog page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message', result: 'error' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})
