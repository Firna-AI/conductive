import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const branchDialog = defineScreen({
  title: 'Dialog',
  description:
    'The New workspace dialog, with the branch control beside the repository picker at the top left. It shows main until Cal picks another branch, as on the page. The phone view is the New workspace page in the same state, because a phone always opens the page. The variants show the open picker, the target choice on each of its values, and the refusal of a missing branch.',
  rationale:
    'The dialog holds the parts of the page, so it holds the branch control and the target choice too, and the page and the dialog share them with the rest of the draft. The control takes the plain tone of the repository picker of the dialog.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'open',
      title: 'Open picker',
      description:
        'The branch picker hangs below the control, over the message: the search field, main first, then the other branches by their newest commit. The phone view is the sheet of the page.',
      rationale:
        'The picker of the dialog is the picker of the page, so the list states of the page apply to it too.',
      props: { branchMenu: 'open' },
    },
    {
      slug: 'target',
      title: 'Target choice',
      description:
        'Cal picked calummoore/checkout-autocomplete. The target choice shows on a line of its own under the pickers, with Target calummoore/checkout-autocomplete selected, and the line about the pull request beside it.',
      rationale:
        'A line of its own keeps the header for the pickers and the place of the workspace, so a long branch name still fits there. The line about the pull request goes under the choice when the two do not fit side by side.',
      props: { branch: 'picked' },
    },
    {
      slug: 'target-default',
      title: 'Target main',
      description:
        'Cal chose Target main in the dialog. The line about the pull request says that it also holds the commits of the branch calummoore/checkout-autocomplete.',
      props: { branch: 'picked', target: 'default' },
    },
    {
      slug: 'missing',
      title: 'Missing branch',
      description:
        'The create from the dialog was refused, because calummoore/checkout-autocomplete is no longer on GitHub. The notice above the footer keeps the message and offers Start from main, as on the page. The dialog stays open.',
      props: { branch: 'picked', result: 'missing-branch' },
    },
  ],
})
