import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const firstTurn = defineScreen({
  title: 'First turn',
  description:
    'The sandbox is ready, and the agent works on the first message. The workspace and its session tab keep the title Saved carts, which they took during the start. The branch keeps its name, and has no changes yet.',
  rationale:
    'The user chose option C of decision 184 on 8 November 2026. The title comes from a small model that the operator runs, when the app accepts the first message, not from the agent of the turn. So the name is ready before the turn starts. The chat does not show the request for the title. The first session takes the same name as the workspace, as the user chose in decision 181.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    conversation: 'first-turn',
    banner: 'no-commits',
  },
  useCasePaths: ['user-flows/create-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
