import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialog = defineScreen({
  title: 'Dialog',
  description:
    'New workspace as a dialog over the ready workspace, for a user who chose Dialog in Preferences. The repository picker sits at the top left, and the org and the section of the new workspace at the top right. The message and its files fill the middle. The model picker sits at the bottom left, and the attach button and Create, with the hint of the Enter key, at the bottom right. Create is off until the message has text and each of its files is uploaded. On a computer, Enter creates the workspace, and Shift+Enter adds a line. The phone view is the New workspace page, because a phone always opens the page.',
  rationale:
    'The user asked on 8 November 2026 that New workspace can open as a dialog, as in a screenshot of the New workspace dialog of Conductor, or as the page. The dialog has no address, so links, a reload, and a new tab always open the page. The user chose option B of decision 143 of PR #73: Enter sends from every composer, and Shift+Enter adds a line. The visibility control and the person picker of the screenshot are left out, because a workspace has no visibility and its creator owns it. The menu beside Create is left out, because the screenshot does not show its choices. Escape and a press outside close the dialog and keep the message, except while the create runs. The states of the dialog are child pages, so this page shows only its canonical screen. A repository that waits for its build shows in the same repository menu and with the same notices as on the page, as app/new-workspace/waiting-repository shows.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: emptyDialog,
  useCasePaths: ['user-flows/create-workspace-dialog'],
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
})
