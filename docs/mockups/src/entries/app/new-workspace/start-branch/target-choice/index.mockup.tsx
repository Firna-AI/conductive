import { defineScreen } from '@mokly/mokly'
import {
  NewWorkspaceScreen,
  newWorkspaceForm,
  newWorkspaceSchema,
} from '../../../../../screens/NewWorkspaceScreen'

export const branchTarget = defineScreen({
  title: 'Target choice',
  description:
    'Cal picked calummoore/checkout-autocomplete, the branch of Checkout address autocomplete, whose pull request #482 waits for its merge, and opened the control again. The dropdown has two parts. Start from checks calummoore/checkout-autocomplete. Target, under a hairline, has two rows: calummoore/checkout-autocomplete, which is checked, and main. The line under them says that the pull request then holds only the new work. A press on a row of Target closes the dropdown on that target. When the dropdown runs out of room, as in the frame of the catalogue, the list of branches scrolls, and the Target part stays in view. A phone shows the same two parts in the sheet. The variants show Target main, and the closed control on each target.',
  rationale:
    'Cal chose option D of decision 301 on 13 November 2026: a picked branch that is not the default branch offers two targets, the picked branch and the default branch. Cal named two real cases. A member stacks on a branch, or works on a long-lived branch such as develop, and targets the picked branch. Or a member branches off a branch and still targets main. Cal chose option A of decision 305 on the same day: the picked branch is selected first, because a member who forgets the choice then gets a pull request with only the new work. Cal chose variant B of decision 309 on 20 November 2026, because the target row under the pickers was too verbose. The two targets moved into the dropdown of the branch control, as rows that name their branches, in the look of the rows of every menu. The words never say fork, because on GitHub a fork is a copy of the repository.',
  relatedDocs: [],
  propSchema: newWorkspaceSchema,
  props: { ...newWorkspaceForm, branch: 'picked', branchMenu: 'open' },
  render: (props, context) => (
    <NewWorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'default',
      title: 'Target main',
      description:
        'Cal chose main in the Target part, then opened the control again. The check is on main, and the line under the rows says that the pull request also holds the commits of the branch calummoore/checkout-autocomplete. The control above the dropdown names calummoore/checkout-autocomplete → main.',
      rationale:
        'This is the case of a branch off a branch that still targets main. The line names the cost of the choice: until calummoore/checkout-autocomplete merges into main, its commits are part of the new pull request.',
      props: { target: 'default' },
    },
    {
      slug: 'picked',
      title: 'Picked branch',
      description:
        'Cal picked calummoore/checkout-autocomplete in the list, and the dropdown closed. The control names the branch alone, because the work targets it, which New workspace selects first. Send creates Saved carts, which stacks on that branch. A phone puts the control on a line of its own under the repository picker.',
      rationale:
        'Decision 309: the closed control names the target only when it is the default branch. The first target needs no word, because the work then stacks on the branch that the control names.',
      props: { branchMenu: 'closed' },
    },
    {
      slug: 'target-main',
      title: 'Target main, closed',
      description:
        'Cal chose main in the Target part, and the dropdown closed. The control names calummoore/checkout-autocomplete → main, with → main in the muted colour of the effort of the model picker. Send creates Saved carts, which starts from that branch and targets main, so Changes and Create PR compare with main. A long name ends in an ellipsis at its end, and → main and the chevron stay in view.',
      rationale:
        'Decision 309: the closed control adds → main while a picked branch targets the default branch, so a member sees that target before Send. Cal has not chosen yet how a long name gives way, so the control keeps the rule of the header: the ellipsis at the end of the name.',
      props: { branchMenu: 'closed', target: 'default' },
    },
  ],
})
