import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../screens/NewWorkspaceScreen'

export const startBranch = defineScreen({
  title: 'Start from a branch',
  description:
    'New workspace in Acme, with the branch control beside the repository picker. The control shows main, the default branch of acme/storefront, until Cal picks another branch, and a press opens the branch picker. The first message creates the workspace on its own new branch, such as calummoore/lisbon-7k2q, which starts from the branch of the control. A phone puts the control under the repository picker when the two do not fit on one line. The child pages show the open picker and its list states, a GitHub account without access, a picked branch with the choice of its target, the refusal of a missing branch, the dialog, and the workspace after a start that stacks on a branch.',
  rationale:
    'Cal asked on 12 November 2026 for starts from a branch that is not the default branch. Cal chose option A of decision 288 on 13 November 2026: the workspace makes its own branch from the picked branch, with the login rule of decision 53. So a branch with an open pull request gets a new stacked pull request, not more commits on that pull request. Option A of decision 289 keeps the change to branches, so starts from pull requests and issues stay in the paused plan. The control is a compact picker beside the repository picker, on the page and in the dialog, as in the design of the paused plan. It always names a branch, so it needs no Clear: the default branch is the first row of the picker. A change of repository puts the control back on the default branch and clears the target, because a branch belongs to one repository. The page and the dialog share the branch and the target with the rest of the draft.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: newWorkspaceForm,
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
