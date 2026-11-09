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
    'A turn runs, takes guidance, stops, or fails. Moved here from the chat page, which now shows only its canonical screen beside its child pages.',
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
        'The user types more guidance while the turn runs. Send adds it to the running turn. No hint appears below the message box, so it keeps its place.',
      movedFrom: 'app/chat/steer',
      props: { conversation: 'steer' },
    },
    {
      slug: 'interrupted',
      title: 'Interrupted',
      description:
        'The user pressed Stop, so the chat says "You stopped the agent". Other members see the name of the user, from decision 72. The running tool call shows as stopped, and the composer is ready for the next message.',
      movedFrom: 'app/chat/interrupted',
      props: { conversation: 'interrupted' },
    },
    {
      slug: 'failed',
      title: 'Turn failed',
      description:
        'The turn stopped with an error from the model provider. The message names the cause, and Try again retries the turn.',
      movedFrom: 'app/chat/failed',
      props: { conversation: 'failed' },
    },
  ],
})
