import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const stackedStart = defineScreen({
  title: 'Stacked workspace',
  description:
    'Saved carts after a start from calummoore/checkout-autocomplete that targets it. The workspace has its own branch, calummoore/lisbon-7k2q, and the agent works on the first message. The pull request bar names the branch and its base, calummoore/lisbon-7k2q → calummoore/checkout-autocomplete, with No commits yet. Changes and Create PR compare with that base, so the later pull request holds only the new work. On a phone the row says No commits yet.',
  rationale:
    'The workspace stores the picked branch as its base. Changes, the diffs, the ahead count of the bar, and get_workspace already read the stored base, as the design calls of the plan say, so the bar needs no new part. A base that is the default branch is stored as none, as for a start from the default branch.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    conversation: 'first-turn',
    banner: 'no-commits',
    base: 'stacked',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'base-moved',
      title: 'Base moved',
      description:
        'Pull request #482 merged, and GitHub deleted calummoore/checkout-autocomplete. The Worker moved the base of Saved carts to main, so the bar names calummoore/lisbon-7k2q → main. A line under the bar says: Now targets main, because the branch calummoore/checkout-autocomplete is no longer on GitHub. On a phone the line shows at the top of the Checks tab.',
      rationale:
        'Cal chose option C of decision 294 on 13 November 2026: when GitHub no longer has the stored base, the Worker moves the base to the default branch, as Continue does under decision 290. It updates the Git setting in the cloud computer, and the bar says that the base moved. Before, the bar said that GitHub was not available, and Create PR targeted a branch that did not exist. The line is a status in the neutral tone, not a refusal, and it stays until a pull request opens, because a pull request names its own base on GitHub.',
      props: { base: 'moved', files: 'checks', focus: 'files' },
    },
  ],
})
