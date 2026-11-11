import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

const mergeFlow = ['user-flows/merge-and-continue'] as const

export const checks = defineScreen({
  title: 'Checks and merge',
  description:
    'The pull request is open, and its checks still run. The bar offers no action of its own. Its number opens the pull request on GitHub.',
  rationale:
    'These states lead to a merge: the checks run, fail, or pass, and the pull request merges. Decision 220 gives them their actions: Fix checks for the agent, Merge for the app, and Continue and Archive after the merge. Moved here from the banner page, which now shows only its canonical screen beside its child pages.',
  relatedDocs: [],
  movedFrom: 'app/banner/checks-running',
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'checks-running' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'failed',
      title: 'Checks failed',
      description:
        'Two checks failed. The bar gives the count, and Fix checks sends the agent a fixed prompt that names the failed checks. The Checks tab names them.',
      movedFrom: 'app/banner/checks-failed',
      props: { banner: 'checks-failed' },
    },
    {
      slug: 'ready-to-merge',
      title: 'Ready to merge',
      description:
        'Every check passed and a reviewer approved. Squash and merge merges as the viewer on one click, with the merge method that GitHub gives the viewer.',
      rationale:
        "The user chose decision 221: a member sees Merge only when GitHub gives that member the right to merge, read with the member's own GitHub token. Decision 228 chose one click with no question. The button names the method, and app/banner/merge shows the merge that runs and each refusal.",
      movedFrom: 'app/banner/ready-to-merge',
      props: { banner: 'ready-to-merge' },
      useCasePaths: mergeFlow,
    },
    {
      slug: 'merged',
      title: 'Merged',
      description:
        'The pull request is merged into the default branch. Continue moves the workspace to a new branch from the latest main and keeps the sessions. Archive shows beside it, for the owner of the workspace and the admins of the org.',
      rationale:
        'The user chose decision 223: Continue keeps the sandbox and the sessions, as in Conductor, and every member may press it, from decision 224. Archive keeps the rule of decision 42. app/banner/continue shows the question with local work, the branch change that runs, a failure, and the wait for a turn.',
      movedFrom: 'app/banner/merged',
      props: { banner: 'merged' },
      useCasePaths: mergeFlow,
    },
  ],
})
