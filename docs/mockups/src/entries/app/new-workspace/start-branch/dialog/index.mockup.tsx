import { defineScreen } from '@mokly/mokly'
import {
  emptyDialog,
  NewWorkspaceDialogScreen,
  newWorkspaceDialogSchema,
} from '../../../../../screens/NewWorkspaceDialogScreen'

export const branchDialog = defineScreen({
  title: 'Dialog',
  description:
    'The New workspace dialog, with the branch control in the header, directly right of the repository picker, in the look and at the size of that picker. It shows main until Cal picks another branch, as on the page. No line follows the header, because the target of a picked branch lives in the dropdown of the control. The phone view is the New workspace page in the same state, because a phone always opens the page. The variants show the open dropdown on main, the picked branch, the dropdown with its Target part, and the picked branch that targets main. The refusal of a missing branch in the dialog moved to app/new-workspace/start-branch/missing/dialog.',
  rationale:
    'Cal chose decision 309 on 20 November 2026: variant B, Pair, with the branch control in the header directly right of the repository picker, not in the footer of the message box, where the five variants drew it. Cal pointed at the place in a picture of the header of this dialog. The dialog holds the parts of the page, and the page and the dialog share the branch and the target with the rest of the draft. The control takes the plain tone of the repository picker of the dialog.',
  relatedDocs: [],
  propSchema: newWorkspaceDialogSchema,
  props: { ...emptyDialog, draft: 'message' },
  render: (props, context) => (
    <NewWorkspaceDialogScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'open',
      title: 'Open dropdown',
      description:
        'The dropdown hangs below the control, over the message: Start from, the search field, main first, then the other branches by their newest commit. main offers no target choice, so no Target part shows. The phone view is the sheet of the page.',
      rationale:
        'The dropdown of the dialog is the dropdown of the page, so the list states of the page apply to it too.',
      props: { branchMenu: 'open' },
    },
    {
      slug: 'picked',
      title: 'Picked branch',
      description:
        'Cal picked calummoore/checkout-autocomplete, and the dropdown closed. The control names the branch alone, because the work targets it. The repository picker, the control, and the org and the section keep one line.',
      rationale:
        'The first target needs no word on the control, because the work then stacks on the branch that the control names.',
      props: { branch: 'picked' },
    },
    {
      slug: 'target',
      title: 'Target',
      description:
        'Cal opened the control again. Start from checks calummoore/checkout-autocomplete. Under the list, the Target part names calummoore/checkout-autocomplete, which is checked, and main, with the line that the pull request then holds only the new work. A press on main closes the dropdown on target main.',
      rationale:
        'This replaces the line of the target choice under the header, which Cal found too verbose on 16 November 2026. The two targets stay one press away from the control, and the closed control still shows a target on main.',
      props: { branch: 'picked', branchMenu: 'open' },
    },
    {
      slug: 'target-main',
      title: 'Target main',
      description:
        'Cal chose main in the Target part, and the dropdown closed. The control in the header names calummoore/checkout-autocomplete → main, with → main in a muted colour. The dialog draws no open dropdown in this state: app/new-workspace/start-branch/target-choice/default shows its Target part with the check on main.',
      rationale:
        'Decision 309: the closed control adds → main while a picked branch targets the default branch, so a member sees that target before Create.',
      props: { branch: 'picked', target: 'default' },
    },
  ],
})
