import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const sandboxStarting = defineScreen({
  title: 'Sandbox starting',
  description:
    'Opening a stopped workspace resumes its sandbox. The chat history shows at once, and the tools wait until the sandbox is ready.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'starting' },
  useCasePaths: ['user-flows/reopen-stopped-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
