import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const startFailedTimeLimit = defineScreen({
  title: 'First start time limit',
  description:
    'The first start of the new workspace did not finish within the 20-minute limit. The workspace stays with its chat and its queue. The bar names the limit with the message that the app saved for the start, and Try again starts a new sandbox. The composer under the bar takes more messages.',
  rationale:
    'The user chose option C of decision 128 on 8 November 2026, and asked that the app tell the user of the limit. A failed first start keeps its workspace (decision 130), so the limit shows in the workspace, as after a resume in app/shell/error/time-limit.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'error',
    startError: 'time-limit',
    conversation: 'queued-follow-up',
    banner: 'no-commits',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
