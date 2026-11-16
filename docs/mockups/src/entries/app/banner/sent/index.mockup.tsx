import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const sent = defineScreen({
  title: 'Agent actions in the chat',
  description:
    'Cal pressed Fix checks. Its prompt went to the session that Cal saw last, as Cal\'s own message, and the agent works on it. The prompt starts with the steps of Fix checks: a first line that names the task, how to read the logs of the failed checks, and what to do when `gh` fails. A line of three dashes follows, then the pull request, the failed checks, and "Don\'t reply on GitHub." The bar still offers Fix checks, and a second press joins the turn that runs.',
  rationale:
    'Decision 220 gives the agent a prompt for each step that changes code. The user chose option C of Prompts decision 1, the first decision of the org prompts change, on 16 November 2026: the steps come from the Prompts tab of the org settings, else from the default steps, and the app adds the facts and the line "Don\'t reply on GitHub." after them, as app/org-settings/prompts shows. An action is a message: it follows each send rule of the composer, runs on the login that the session rules give it, and the chat keeps a record of each request. Each press asks for no reply on GitHub, because a reply posts as the member. A workspace from an older org image can lack `gh`, so each default step that needs it says what to do then. A design call of 16 November 2026 starts each long default with a short line that names the task, because a session that a press starts takes its first line as its title. The chat shows the message as the agent gets it, so the dashes stay plain text.',
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
        'After a stopped turn left commits without a pull request, Cal pressed Create PR. The steps ask the agent to commit, push, and open the pull request into the target branch with `gh`, or to push and say so when `gh` fails. The facts name main as the target branch.',
      props: { banner: 'none', conversation: 'sent-create-pull-request' },
    },
    {
      slug: 'commit-and-push',
      title: 'Commit and push',
      description:
        'The sandbox had local work, so Cal pressed Commit and push in the place of Merge. The steps ask the agent to commit with a clear message and push the branch. Commit and push names no facts, so only the dashes and "Don\'t reply on GitHub." follow the steps.',
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
        'The sandbox had commits that are not pushed and no changed files, so Cal pressed Push in the place of Merge. The steps ask the agent to push the branch, and "Don\'t reply on GitHub." follows them.',
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
        'The pull request has a conflict with main, so Cal pressed Resolve conflicts. The default steps ask the agent to merge the latest target branch, resolve each conflict, and run the tests. The facts name the pull request and main. An admin can replace these steps, as app/org-settings/prompts/edited shows.',
      props: { banner: 'conflict', conversation: 'sent-resolve-conflicts' },
    },
    {
      slug: 'address-review',
      title: 'Address review',
      description:
        'A reviewer requested changes, so Cal pressed Address review. The steps ask the agent to read the open review comments with `gh` and make the changes. The facts name the pull request and the reviewer, and the last line asks for no reply on GitHub.',
      props: {
        banner: 'changes-requested',
        conversation: 'sent-address-review',
      },
    },
  ],
})
