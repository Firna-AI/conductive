import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const startBranch = defineScreen({
  title: 'Start from a branch',
  description:
    'New workspace in Acme, with the branch control directly right of the repository picker, in the look and at the size of that picker: the branch icon, the name, and a chevron. The control shows main, the default branch of acme/storefront, until Cal picks another branch, and a press opens its dropdown. The first message creates the workspace on its own new branch, such as calummoore/lisbon-7k2q, which starts from the branch of the control. While a picked branch targets main, the control adds a muted → main after the name. A long name ends in an ellipsis at its end, as the header does today, and → main and the chevron stay in view. A phone puts the control under the repository picker when the two do not fit on one line. The child pages show the dropdown and its list states, a GitHub account without access, a picked branch with its two targets, the refusal of a missing branch, the dialog, and the workspace after a start that stacks on a branch.',
  rationale:
    'Cal asked on 12 November 2026 for starts from a branch that is not the default branch. Cal chose option A of decision 298 on 13 November 2026: the workspace makes its own branch from the picked branch, with the login rule of decision 53. So a branch with an open pull request gets a new stacked pull request, not more commits on that pull request. Option A of decision 299 keeps the change to branches, so starts from pull requests and issues stay in the paused plan. Cal chose decision 309 on 20 November 2026: variant B, Pair, of the compact variants, with the control in the header directly right of the repository picker. Its dropdown holds the target of a picked branch, so no target row shows under the pickers. The control always names a branch, so it needs no Clear: the default branch is the first row of the list. A change of repository puts the control back on the default branch and clears the target, because a branch belongs to one repository. The page and the dialog share the branch and the target with the rest of the draft. Cal has not chosen yet how a long name gives way, so the control keeps the rule of the header: the ellipsis at the end of the name.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: newWorkspaceForm,
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
