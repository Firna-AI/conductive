import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const retrying = defineScreen({
  title: 'Try again',
  description:
    'A member chose Try again after the failed first start. A new sandbox starts in the same workspace, and the chat shows each step of the start. The three messages wait in their order. The last one is the message that Priya sent during the error.',
  rationale:
    'The user chose option D of decision 130 on 8 November 2026. Try again starts a new cloud computer in the same workspace, with a new workspace token, and the app cleans up the failed one. The queue keeps its order, and the agent gets the messages when the sandbox is ready.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued-retry',
    banner: 'no-commits',
  },
  useCasePaths: ['user-flows/retry-first-start'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
