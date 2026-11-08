import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const chat = defineScreen({
  title: 'Chat',
  description:
    "A finished turn: the request, the agent's replies, and its tool calls folded into one line each. The turn ends with its duration and the files it changed. The agent opened a pull request, whose checks run. The child pages show running, stopped, and failed turns, the data that the chat does not have, the notice that shows only when the repair of a lost update without a session fails, and the files that the cloud computer could not read.",
  rationale:
    "Tool calls fold into one grey line, so the agent's words carry the turn, and a run with a call in progress shows each call. The newest message stays in view at the bottom.",
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, banner: 'checks-running' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
