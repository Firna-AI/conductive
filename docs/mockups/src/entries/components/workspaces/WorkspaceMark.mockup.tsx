import { defineComponent } from '@mokly/mokly'
import type { GitHubSummary } from '../../../../../../src/shared/generated/GitHubSummary'
import { WorkspaceMark } from '../../../components/workspaces/WorkspaceMark'
import type { ActivityStatus } from '../../../fixtures/workspaces'

/**
 * The GitHub states of a pull request that the mark shows in colour. A
 * state that a screen passes and this list leaves out fails the build.
 */
const githubStates = [
  'checks-running',
  'checks-failed',
  'ready-to-merge',
  'merged',
  'conflict',
  'changes-requested',
  'draft',
  'blocked',
] as const satisfies readonly GitHubSummary[]

/** The states of a workspace that the mark shows. */
const activityStatuses = [
  'working',
  'input',
  'unread',
  'ready',
  'starting',
  'stopped',
  'error',
  'archived',
] as const satisfies readonly ActivityStatus[]

/**
 * The list mark of a workspace, registered with Mokly. Mockup-only parts
 * render `workspaceMark.Component`, so that a change to the mark gives one
 * Changes row for the mark, with the screens that use it under its
 * Affected screens. A part that the app reaches keeps the plain
 * `WorkspaceMark`, because the wrapper renders only inside Mokly.
 *
 * A changed CSS rule goes to the mark only when it matches on the pages of
 * the mark: its own props and its variants. So these five pages show the
 * five tones that almost every list shows, and the chase, the pulse, and
 * the still light of running checks. The amber tone and an archived mark
 * have no page, so a change to their rules gives each screen that shows
 * them its own row.
 */
export const workspaceMark = defineComponent({
  slug: 'workspace-mark',
  title: 'Workspace mark',
  description:
    'The list mark of a workspace in the list, the command palette, and the workspace chips: the GitHub state of its pull request in the tone of its pull request bar, a light that runs around the ring while the agent works or the checks run, and a pulse while the agent needs input. Its own page shows a merged pull request of a stopped workspace, the mark of almost every list.',
  relatedDocs: ['docs/mockups/design-marks.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['github', 'status'],
    properties: {
      /** The GitHub state of the pull request, or `null` without one. */
      github: { enum: [...githubStates, null] },
      status: { enum: activityStatuses },
    },
  } as const,
  props: { github: 'merged', status: 'stopped' },
  render: (props) => (
    <WorkspaceMark github={props.github} status={props.status} />
  ),
  variants: [
    {
      slug: 'checks-failed',
      title: 'Checks failed',
      description: 'Failed checks: a still rose mark.',
      props: { github: 'checks-failed', status: 'error' },
    },
    {
      slug: 'needs-input',
      title: 'Needs input',
      description:
        'A pull request that is ready to merge while the agent waits for the user: the green mark pulses.',
      props: { github: 'ready-to-merge', status: 'input' },
    },
    {
      slug: 'checks-running',
      title: 'Checks running',
      description:
        'Checks that run while the agent does not work: a grey mark with a light that runs around the ring. Without motion, the whole grid stays lit.',
      props: { github: 'checks-running', status: 'stopped' },
    },
    {
      slug: 'working',
      title: 'Agent working',
      description:
        'An agent that works on a branch without a GitHub state: a dim grey mark with a light that runs around the ring.',
      props: { github: null, status: 'working' },
    },
  ],
})
