import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const firstTurn = defineScreen({
  title: 'First turn',
  description:
    'The sandbox is ready, and the agent works on the first message. Its first answer named the workspace Saved carts. The branch keeps its name, and has no changes yet.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    conversation: 'first-turn',
    banner: 'none',
  },
  useCasePaths: ['user-flows/create-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
