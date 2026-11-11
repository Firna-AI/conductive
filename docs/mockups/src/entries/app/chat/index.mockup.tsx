import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const chat = defineScreen({
  title: 'Chat',
  description:
    'A finished turn: the request, its work folded into one line, "11 tool calls, 2 messages", and the answer of the agent under it. The turn ends with its duration and the files it changed. The agent opened a pull request, whose checks run. The child pages show running, stopped, and failed turns, the open work of a turn, tables in replies, the data that the chat does not have, the notice that shows only when the repair of a lost update without a session fails, the files that the cloud computer could not read, and a turn whose background work stopped at the time limit.',
  rationale:
    'The user chose B of decision 150 on 8 November 2026: when a turn ends, the work before its answer folds into one grey line, so the answer sits right under the request. The line counts the tool calls and the messages, and shows the icons of the kinds of tool calls. While a turn runs, each message shows, and each run of tool calls folds into its own line. On 11 November 2026, the user chose that only the newest run shows each call while the turn runs, until a newer run starts or the turn ends. The newest message stays in view at the bottom.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, banner: 'checks-running' },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
