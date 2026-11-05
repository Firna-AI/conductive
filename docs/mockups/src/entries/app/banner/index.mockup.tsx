import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

const withPullRequest = { conversation: 'history' } as const

export const gitHubBanner = defineScreen({
  title: 'GitHub banner',
  description:
    'The branch has no pull request yet: the agent was stopped before it opened one. The pull request bar shows the branch and its target, with a link that creates the pull request on GitHub. The Checks tab waits for a pull request.',
  rationale:
    'The pull request bar sits at the top of the right column, above the Checks tab, which lists each check that GitHub reports. On a phone a compact row at the top of the workspace opens the checks. Status uses an icon and words, never only a colour, and a state tints the whole bar, never one edge.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'interrupted',
    banner: 'none',
    files: 'checks',
    tool: 'preview',
    focus: 'files',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'checks-running',
      title: 'Checks running',
      description: 'The pull request is open, and its checks still run.',
      props: { ...withPullRequest, banner: 'checks-running' },
    },
    {
      slug: 'checks-failed',
      title: 'Checks failed',
      description:
        'Two checks failed. The bar gives the count, and the Checks tab names them.',
      props: { ...withPullRequest, banner: 'checks-failed' },
    },
    {
      slug: 'ready-to-merge',
      title: 'Ready to merge',
      description:
        'Every check passed and a reviewer approved. Open on GitHub stands where a merge button would be, because the app does not merge.',
      props: { ...withPullRequest, banner: 'ready-to-merge' },
    },
    {
      slug: 'merged',
      title: 'Merged',
      description: 'The pull request is merged into the default branch.',
      props: { ...withPullRequest, banner: 'merged' },
    },
  ],
})
