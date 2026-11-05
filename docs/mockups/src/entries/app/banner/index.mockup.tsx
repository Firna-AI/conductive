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
    'The branch has no pull request yet: the agent was stopped before it opened one. The banner shows the branch and its target, with a link that creates the pull request on GitHub.',
  rationale:
    'The banner keeps one line on desktop and one row on mobile. Status uses an icon and words, never only a colour, and no state has an accent strip on its edge.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'interrupted',
    banner: 'none',
    tool: 'preview',
    focus: 'tool',
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
        'Two checks failed. Desktop names them; mobile gives the count.',
      props: { ...withPullRequest, banner: 'checks-failed' },
    },
    {
      slug: 'ready-to-merge',
      title: 'Ready to merge',
      description: 'Every check passed and a reviewer approved.',
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
