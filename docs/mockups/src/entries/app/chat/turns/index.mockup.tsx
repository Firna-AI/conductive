import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const chatTurns = defineScreen({
  title: 'Running turn',
  description:
    'The agent works: the current run of tool calls shows each call, and the elapsed time shows. Stop sits beside Send, and the composer steers the turn.',
  rationale:
    'A turn runs, takes guidance, stops, or fails. Its work folds only when it ends, so the user sees each step while the agent works. Moved here from the chat page, which now shows only its canonical screen beside its child pages.',
  relatedDocs: [],
  movedFrom: 'app/chat/running',
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, conversation: 'running', banner: 'none' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'steer',
      title: 'Steer while running',
      description:
        'The user types more guidance while the turn runs. Send adds it to the running turn, where it starts a new part, as `app/chat/work/steered` shows after the turn ends.',
      movedFrom: 'app/chat/steer',
      props: { conversation: 'steer' },
    },
    {
      slug: 'interrupted',
      title: 'Interrupted',
      description:
        'The user pressed Stop, so the chat says "You stopped the agent". Other members see the name of the user, from decision 72. The work before the last message of the agent folds into one line. That message and the tool calls after it stay in view, and the call that the stop cut off shows as stopped. The composer is ready for the next message.',
      rationale:
        'A stopped turn keeps the last words of the agent and the calls that the stop cut off in view, because the user needs them to write the next message. A fold of all the work of a turn that ends with a tool call was rejected, because it hides where the turn stopped.',
      movedFrom: 'app/chat/interrupted',
      props: { conversation: 'interrupted' },
    },
    {
      slug: 'failed',
      title: 'Turn failed',
      description:
        'The turn stopped with an error from the model provider. The work before the last message of the agent folds into one line, and that message and the tool calls after it stay in view. The error names the cause, and Try again retries the turn.',
      movedFrom: 'app/chat/failed',
      props: { conversation: 'failed' },
    },
  ],
})
