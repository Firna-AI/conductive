import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const continueAfterMerge = defineScreen({
  title: 'Continue',
  description:
    'Cal pressed Continue after the merge, and its check found local work. The question lists it: the changed files move to the new branch, and the commit that no remote branch holds stays on its local branch. Continue anyway goes on, and Cancel keeps the workspace on its branch. On a phone the question is a sheet.',
  rationale:
    'The user chose decision 223: Continue moves the workspace to a new branch from the latest main, and keeps the sandbox and the sessions. The check counts the commits of every local branch, as the check of Archive does, so a commit left by an earlier Continue still shows. Without local work, Continue starts at once.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...checksWorkspace,
    banner: 'merged',
    localWork: 'changes',
    overlay: 'continue-unpushed',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'The branch change runs',
      description:
        "Continue runs: it starts a stopped sandbox first, fetches the latest main with Cal's GitHub access, and creates the new branch with the changed files. The button shows a spinner and Continuing, and Archive waits.",
      rationale:
        'Decision 226 chose the access of the member who pressed Continue for the fetch of the base.',
      props: { appAction: 'continuing', overlay: 'none' },
      useCasePaths: ['user-flows/merge-and-continue'],
    },
    {
      slug: 'failed',
      title: 'Continue stopped',
      description:
        'Git could not move the changed files to the new branch, because they clash with the latest main. Continue stopped and kept the old branch, and the message under the bar names the reason. Continue stays, so Cal can try again.',
      props: { appAction: 'continue-failed', overlay: 'none' },
    },
    {
      slug: 'waits',
      title: 'Continue while a turn runs',
      description:
        'The agent works on a message in a session of the workspace. Continue is not available, and a message under the bar says that it waits for the agent to finish, so no branch change mixes into the edits of a running turn.',
      props: {
        localWork: 'none',
        conversation: 'after-merge-running',
        overlay: 'none',
      },
    },
    {
      slug: 'member',
      title: 'Continue for a member',
      description:
        'Priya, a member who neither owns the workspace nor is an admin, sees Continue without Archive. Every member of the org may continue a workspace, and only the owner and the admins may archive it.',
      rationale:
        'The user chose decision 224: every member of the org may continue each workspace of the org. Archive keeps the rule of decision 42.',
      props: { viewer: 'member', localWork: 'none', overlay: 'none' },
    },
  ],
})
