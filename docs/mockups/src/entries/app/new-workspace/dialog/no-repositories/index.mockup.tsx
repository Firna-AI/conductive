import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialogNoRepositories = defineScreen({
  title: 'No repositories',
  description:
    'Acme has chosen no repositories yet, so the dialog has no repository picker, and Create is off. The notice asks to choose the repositories of Acme first. For an admin, Choose repositories closes the dialog and opens the Repositories tab of the org settings. A member who is not an admin reads that an admin of Acme chooses its repositories first, without the button.',
  rationale:
    'Moved here from a saved state of the dialog page, with the same path, so that page shows only its canonical screen.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, repositories: 'none' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})
