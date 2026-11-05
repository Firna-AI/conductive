import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const sandboxStopped = defineScreen({
  title: 'Sandbox stopped',
  description:
    'The sandbox stopped while the workspace was open, for example in a background tab. The chat history stays, and Resume starts the sandbox again.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'stopped' },

  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
