import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const chat = defineScreen({
  title: 'Chat',
  description:
    "A finished turn: the request, the agent's replies, and its tool calls folded into one line each. The turn ends with its duration and the files it changed. The agent opened a pull request, whose checks run.",
  rationale:
    "Tool calls fold into one grey line, so the agent's words carry the turn, and a run with a call in progress shows each call. The newest message stays in view at the bottom.",
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, banner: 'checks-running' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'Running turn',
      description:
        'The agent works: the current run of tool calls shows each call, and the elapsed time shows. Stop sits beside Send, and the composer steers the turn.',
      props: { conversation: 'running', banner: 'none' },
    },
    {
      slug: 'steer',
      title: 'Steer while running',
      description:
        'The user types more guidance while the turn runs. Send adds it to the running turn.',
      props: { conversation: 'steer', banner: 'none' },
    },
    {
      slug: 'interrupted',
      title: 'Interrupted',
      description:
        'The user pressed Stop. The running tool call shows as stopped, and the composer is ready for the next message.',
      props: { conversation: 'interrupted', banner: 'none' },
    },
    {
      slug: 'failed',
      title: 'Turn failed',
      description:
        'The turn stopped with an error from the model provider. The message names the cause, and Try again retries the turn.',
      props: { conversation: 'failed', banner: 'none' },
    },
  ],
})
