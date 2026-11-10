import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const previewRepair = defineScreen({
  title: 'Failed list repair',
  description:
    'A report of the servers was lost, and the fresh full report that the workspace asked for was lost too. The port form keeps its last list and the Other port row. A notice under them says that the latest list of servers is unavailable, with the time since the failure. A newer full report clears the notice. The other states of the Preview tool are at app/tools/preview.',
  rationale:
    'The list joins the lost workspace updates of decision 96, so a failed repair shows a notice beside the data, and the first loss shows nothing. The notice is the row of a file list that is not the latest one, with its words and its time, and it has no Dismiss. It shows only in the Preview tool, beside the list. This page stands beside app/tools/preview, which already shows five screens.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    conversation: 'running',
    banner: 'none',
    tool: 'preview',
    ports: 'repair-failed',
    focus: 'tool',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
