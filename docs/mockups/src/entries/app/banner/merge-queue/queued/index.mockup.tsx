import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeQueueQueued = defineScreen({
  title: 'Bottom layer and fix turns',
  description:
    'Checkout address autocomplete is the bottom layer of the queue, place 1 of 3. It targets main, so the line says "Place 1 of 3 in the merge queue. It builds on main." Its checks run, so the bar has no main action.',
  rationale:
    'The bottom layer of a GitHub stack targets the trunk, the default branch (decision 320), and it merges first.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'checks-running', queue: 'bottom' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'restack',
      title: 'Restack',
      description:
        'A fix of #479 pushed new commits, and the rebase of GitHub hit a conflict. So the queue sent the restack prompt as a message of Cal, who queued #482, and the agent works on it. The prompt names the new head of the branch of #479 and the old base commit, for `git rebase --onto`, then a push with `--force-with-lease`. The line shows a spinner and "Rebasing onto #479". The bar shows the conflict, with the branch of #479 as its detail in a wide column.',
      rationale:
        'Decision 319 B: the queue first asks GitHub for a server rebase, and sends a fix turn only on a conflict. The fix turn goes as a message of the queuer (decision 314 A). `--onto` keeps only the own commits of the branch, also after a squash merge below it.',
      props: {
        banner: 'conflict',
        queue: 'restack',
        conversation: 'sent-restack',
        focus: 'chat',
      },
    },
    {
      slug: 'rebase',
      title: 'Resolve conflicts with a rebase',
      description:
        '#482 has a conflict with the branch of #479. The queue sent its one fix turn with the prompt of Resolve conflicts, as a message of Cal. In the queue, the prompt asks for a rebase onto the branch of #479 and a push with `--force-with-lease`, not a merge. The line says Resolving conflicts. A press on Resolve conflicts in the bar sends the same prompt.',
      rationale:
        'A GitHub stack needs a linear history, so while a workspace is queued, Resolve conflicts, Merge latest, and the restack ask for a rebase.',
      props: {
        banner: 'conflict',
        queue: 'rebase',
        conversation: 'sent-rebase-conflicts',
        focus: 'chat',
      },
    },
  ],
})
