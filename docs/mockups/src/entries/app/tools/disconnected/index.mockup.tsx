import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const terminalDisconnected = defineScreen({
  title: 'Terminal disconnected',
  description:
    'The connection of Terminal 2 ended. The screen keeps its output, so the user can still select and copy it, and it takes no input. The bar under it shows Disconnected and Reconnect, in the place of the keys on a phone. Reconnect returns to the same shell, with its running commands.',
  rationale:
    'Each terminal keeps its shell when its connection drops (decision 118), and each terminal shows its own connection. The other terminals keep their own connections.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'terminal',
    terminals: 'disconnected',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
