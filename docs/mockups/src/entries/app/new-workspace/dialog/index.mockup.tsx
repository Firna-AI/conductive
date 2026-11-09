import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../screens/NewWorkspaceDialogScreen'

export const newWorkspaceDialog = defineScreen({
  title: 'Dialog',
  description:
    'New workspace as a dialog over the ready workspace, for a user who chose Dialog in Preferences. The repository picker sits at the top left, and the org and the section of the new workspace at the top right. The message and its files fill the middle. The model picker sits at the bottom left, and the attach button and Create, with the hint of the Enter key, at the bottom right. Create is off until the message has text. On a computer, Enter creates the workspace, and Shift+Enter adds a line. The phone view is the New workspace page, because a phone always opens the page.',
  rationale:
    'The user asked on 8 November 2026 that New workspace can open as a dialog, as in a screenshot of the New workspace dialog of Conductor, or as the page. The dialog has no address, so links, a reload, and a new tab always open the page. The user chose option B of decision 143: Enter sends from every composer, and Shift+Enter adds a line. The visibility control and the person picker of the screenshot are left out, because a workspace has no visibility and its creator owns it. The menu beside Create is left out, because the screenshot does not show its choices. Escape and a press outside close the dialog and keep the message, except while the create runs.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: emptyDialog,
  useCasePaths: ['user-flows/create-workspace-dialog'],
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'no-login',
      title: 'Agent not connected',
      description:
        'The task is written, with an attached picture, and Claude is not connected. The notice above the footer asks to connect Claude to use Opus 5.5, and Create is off. Connect Claude closes the dialog and opens the account with the Connect form of Claude. The message and its file stay.',
      rationale:
        'The dialog shows the notices of the page. An action that opens another page closes the dialog first. The page and the dialog share the draft of the org and the section, so no close loses the message.',
      props: { draft: 'file', login: 'missing' },
    },
    {
      slug: 'not-created',
      title: 'Not created',
      description:
        'The create request did not reach the server. The dialog stays open with the message, and the notice says that the workspace was not created, with Try again.',
      rationale:
        'The dialog closes when the create succeeds, and the new workspace opens, as from the page. A first start that fails after that keeps the workspace with its queued message and Try again. So the dialog shows only a create request that failed.',
      props: { draft: 'message', result: 'error' },
    },
    {
      slug: 'no-repositories',
      title: 'No repositories',
      description:
        'Acme has chosen no repositories yet, so the dialog has no repository picker, and Create is off. The notice asks to choose the repositories of Acme first. For an admin, Choose repositories closes the dialog and opens the Repositories tab of the org settings. A member who is not an admin reads that an admin of Acme chooses its repositories first, without the button.',
      props: { repositories: 'none' },
    },
  ],
})
