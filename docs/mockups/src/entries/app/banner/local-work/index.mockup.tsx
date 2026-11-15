import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  checksWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const localWork = defineScreen({
  title: 'Local work',
  description:
    'The pull request is ready to merge, but the sandbox has changed files that are not committed. Commit and push takes the place of Merge, and asks the agent to commit the changes and push the branch. When the sandbox has only commits that are not pushed, the button says Push.',
  rationale:
    'The user chose decision 228: while the sandbox has local work, Commit and push takes the place of Merge and of the fixes, so no merge leaves work behind in the sandbox. Local work is changed files that are not committed, also an untracked file, or commits that no remote branch holds. The user chose on 12 November 2026 that the button says Push when only commits are left, because nothing is left to commit. A closed or merged pull request has no Commit and push and no Push.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...checksWorkspace, banner: 'ready-to-merge', localWork: 'changes' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'commits',
      title: 'Only commits not pushed',
      description:
        'The pull request is ready to merge. The sandbox has no changed files, but it has commits that no remote branch holds. Push takes the place of Merge, and asks the agent to push the branch.',
      props: { localWork: 'commits' },
    },
    {
      slug: 'checks-failed',
      title: 'Checks failed',
      description:
        'Two checks failed, and the sandbox has local work. Commit and push takes the place of Fix checks.',
      props: { banner: 'checks-failed' },
    },
    {
      slug: 'conflict',
      title: 'Merge conflict',
      description:
        'The pull request has a conflict, and the sandbox has local work. Commit and push takes the place of Resolve conflicts.',
      props: { banner: 'conflict' },
    },
    {
      slug: 'changes-requested',
      title: 'Changes requested',
      description:
        'A reviewer requested changes, and the sandbox has local work. Commit and push takes the place of Address review.',
      props: { banner: 'changes-requested' },
    },
    {
      slug: 'checks-running',
      title: 'Checks running',
      description:
        'The checks run, and the sandbox has local work. A state without an action of its own also offers Commit and push.',
      props: { banner: 'checks-running' },
    },
  ],
})
