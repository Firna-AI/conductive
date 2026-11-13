import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const branchTarget = defineScreen({
  title: 'Target choice',
  description:
    'Cal picked calummoore/checkout-autocomplete, the branch of Checkout address autocomplete, whose pull request #482 waits for its merge. The control names it, and the choice of two targets shows under the pickers: Target calummoore/checkout-autocomplete, which is selected, and Target main. The line under the choice says that the pull request then holds only the new work. Send creates Saved carts, which stacks on that branch. A phone shows the two targets as radio cards, one above the other.',
  rationale:
    'Cal chose option D of decision 291 on 13 November 2026: a picked branch that is not the default branch offers two targets, the picked branch and the default branch. Cal named two real cases. A member stacks on a branch, or works on a long-lived branch such as develop, and targets the picked branch. Or a member branches off a branch and still targets main. Cal chose option A of decision 295 on the same day: the picked branch is selected first, because a member who forgets the choice then gets a pull request with only the new work. The labels name the branches, and the words never say fork, because on GitHub a fork is a copy of the repository. A segmented control fits the two labels on a computer. A phone has no room for two branch names side by side, so it shows radio cards.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, branch: 'picked' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'default',
      title: 'Target main',
      description:
        'Cal chose Target main. The line under the choice says that the pull request also holds the commits of calummoore/checkout-autocomplete. Send creates Saved carts, which starts from that branch and targets main, so Changes and Create PR compare with main.',
      rationale:
        'This is the case of a branch off a branch that still targets main. The line names the cost of the choice: until calummoore/checkout-autocomplete merges into main, its commits are part of the new pull request.',
      props: { target: 'default' },
    },
  ],
})
