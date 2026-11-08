import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const firstTurn = defineScreen({
  title: 'First turn',
  description:
    'The sandbox is ready, and the agent works on the first message. When the turn started, the agent wrote the title Saved carts from that message. The workspace and its session tab took the title in place of Lisbon. The branch keeps its name, and has no changes yet.',
  rationale:
    'The user chose option B of decision 142 on 8 November 2026. The agent writes the title from the first message when the first turn starts, so the name shows soon after the sandbox is ready, not after the first answer. The chat does not show the request for the title. The first session takes the same name as the workspace, as the user chose in decision 143.',
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
