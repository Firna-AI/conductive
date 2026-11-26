import { defineComponent } from '@mokly/mokly'
import { WorkspaceMark } from '../../../../../../src/ui/components/workspaces/WorkspaceMark'
import { activityStatuses, githubSchema } from './workspaceSchemas'

/**
 * The list mark of a workspace, registered with Mokly. Mockup-only parts
 * render `workspaceMark.Component`, so that Changes lists a change to the
 * mark under the mark, with the screens that use it under its Affected
 * screens. A part that the app reaches keeps the plain
 * `WorkspaceMark`, because the wrapper renders only inside Mokly.
 *
 * A changed CSS rule goes to the mark only when it matches on the pages of
 * the mark: its own props and its variants. So these pages show the five
 * tones that almost every list shows, the chase, the pulse, the still
 * light of running checks, and a start with and without a waiting
 * message. The amber tone and an archived mark
 * have no page, so a change to their rules gives each screen that shows
 * them its own row.
 */
export const workspaceMark = defineComponent({
  slug: 'workspace-mark',
  title: 'Workspace mark',
  description:
    'The list mark of a workspace in the list, the command palette, and the workspace chips: the GitHub state of its pull request in the tone of its pull request bar, a light that runs around the ring while the agent works, a message waits for the workspace to start, or the checks run, and a pulse while the agent needs input. Its own page shows a merged pull request of a stopped workspace, the mark of almost every list.',
  relatedDocs: ['docs/mockups/design-marks.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['github', 'status'],
    properties: {
      github: githubSchema,
      status: { enum: activityStatuses },
      messageWaiting: { type: 'boolean' },
    },
  } as const,
  props: { github: 'merged', status: 'stopped' },
  render: (props) => (
    <WorkspaceMark
      github={props.github}
      messageWaiting={props.messageWaiting}
      status={props.status}
    />
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
    {
      slug: 'starting-with-message',
      title: 'Starting with a message',
      description:
        'A message that waits for the cloud computer to start: a dim grey mark with a light that runs around the ring, as for a working agent.',
      props: { github: null, status: 'starting', messageWaiting: true },
    },
    {
      slug: 'starting',
      title: 'Starting',
      description:
        'A start that no message waits on, such as after a member opened a stopped workspace: a still mark in the tone of its pull request bar.',
      props: { github: 'ready-to-merge', status: 'starting' },
    },
  ],
})
