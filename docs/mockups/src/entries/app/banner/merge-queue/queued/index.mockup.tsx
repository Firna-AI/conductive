import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const bannerMergeQueueQueued = defineScreen({
  title: 'Bottom layer and a restack conflict',
  description:
    'Checkout address autocomplete is the bottom layer of the queue, place 1 of 3. It targets main, so the line says "Place 1 of 3 in the merge queue. It builds on main." Its checks run, so the bar has no main action. The variants follow a conflict of a restack: the one turn of the queue, the wait for a member after that turn, and Resolve conflicts.',
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
      title: 'The one turn of the queue',
      description:
        'A fix of #479 pushed new commits. The queue moves #482 onto that new head and sends its one fix turn as Cal, who queued #482. The prompt names the new head and the old base commit for `git rebase --onto`. It asks for `git push --force-with-lease --force-if-includes`. The line shows a spinner and "Rebasing onto #479" until the turn ends. The bar shows the conflict, with the branch of #479 as its detail in a wide column. If the conflict stays, the entry waits for a member.',
      rationale:
        'Cal chose decision 321 A on 23 November 2026: the queue caused the conflict with its own move, so it sends one agent turn as the queuer, and each pull request builds on the work ahead with no click. Decision 319 B: the queue first asks GitHub for a server rebase, and sends the turn only on a conflict. The turn goes as a message of the queuer (decision 314 A). `--onto` keeps only the own commits of the branch, also after a squash merge below it.',
      props: {
        banner: 'conflict',
        queue: 'restack',
        conversation: 'sent-restack',
        focus: 'chat',
      },
    },
    {
      slug: 'rebase-waits',
      title: 'Waits for a rebase',
      description:
        'The one turn of the queue ended, and the conflict stays: #479 and #482 change the address step of the checkout form in two ways, so the agent stopped the rebase and asks which layout to keep. The queue sends no second turn. #482 keeps place 3 of 3, and the line says "Place 3 of 3 in the merge queue. The queue waits for a rebase onto #479." The bar shows Resolve conflicts, as for any conflict, and Remove from queue ends the line. In the sidebar, the amber mark of #482 stays on the line in its place. On a phone the line stands at the top of the Checks tab, above Resolve conflicts.',
      rationale:
        'Decision 321 A: when the turn does not resolve the conflict, the entry waits in its place for a member, as "Failures" of the plan says for any failure. The member answers the agent, presses Resolve conflicts, or removes the entry.',
      props: {
        banner: 'conflict',
        queue: 'rebase',
        conversation: 'restack-ended',
      },
    },
    {
      slug: 'rebase',
      title: 'Resolve conflicts with a rebase',
      description:
        'After the turn of the queue left the conflict, Cal pressed Resolve conflicts. The prompt uses the branch of #479 from queue order. It asks for `git rebase --onto` and `git push --force-with-lease --force-if-includes`. It goes as a message of the member who pressed it. The line still says "The queue waits for a rebase onto #479." until the push resolves the conflict.',
      rationale:
        'A GitHub stack needs a linear history, so while a workspace is queued, Resolve conflicts, Merge latest, and the restack ask for a rebase. The queue itself sends only its one turn, with the restack prompt (decision 321 A).',
      props: {
        banner: 'conflict',
        queue: 'rebase',
        conversation: 'sent-rebase-conflicts',
        focus: 'chat',
      },
    },
  ],
})
