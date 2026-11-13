import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sent = defineScreen({
  title: 'Agent actions in the chat',
  description:
    "Cal pressed Fix checks. Its fixed prompt went to the session that Cal saw last, as Cal's own message, and the agent works on it. The prompt names the pull request and the failed checks, says how to read their logs, and what to do when `gh` fails. The bar still offers Fix checks, and a second press joins the turn that runs.",
  rationale:
    'Decision 220 gives the agent a fixed prompt for each step that changes code. An action is a message: it follows each send rule of the composer, runs on the login that the session rules give it, and the chat keeps a record of each request. The prompts ask for no reply on GitHub, because a reply posts as the member. A workspace from an older org image can lack `gh`, so each prompt that needs it says what to do then.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    focus: 'chat',
    banner: 'checks-failed',
    conversation: 'sent-fix-checks',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'create-pull-request',
      title: 'Create PR',
      description:
        'After a stopped turn left commits without a pull request, Cal pressed Create PR. The prompt asks the agent to commit, push, and open the pull request into main with `gh`, or to push and say so when `gh` fails.',
      props: { banner: 'none', conversation: 'sent-create-pull-request' },
    },
    {
      slug: 'commit-and-push',
      title: 'Commit and push',
      description:
        'The sandbox had local work, so Cal pressed Commit and push in the place of Merge. The prompt asks the agent to commit with a clear message and push the branch.',
      props: {
        banner: 'ready-to-merge',
        localWork: 'changes',
        conversation: 'sent-commit-and-push',
      },
    },
    {
      slug: 'push',
      title: 'Push',
      description:
        'The sandbox had commits that are not pushed and no changed files, so Cal pressed Push in the place of Merge. The prompt asks the agent to push the branch.',
      props: {
        banner: 'ready-to-merge',
        localWork: 'commits',
        conversation: 'sent-push',
      },
    },
    {
      slug: 'resolve-conflicts',
      title: 'Resolve conflicts',
      description:
        'The pull request has a conflict with main, so Cal pressed Resolve conflicts. The prompt asks the agent to merge the latest main, resolve each conflict, and run the tests.',
      props: { banner: 'conflict', conversation: 'sent-resolve-conflicts' },
    },
    {
      slug: 'address-review',
      title: 'Address review',
      description:
        'A reviewer requested changes, so Cal pressed Address review. The prompt names the reviewer, asks the agent to read the open review comments with `gh` and make the changes, and to reply nothing on GitHub.',
      props: {
        banner: 'changes-requested',
        conversation: 'sent-address-review',
      },
    },
  ],
})
