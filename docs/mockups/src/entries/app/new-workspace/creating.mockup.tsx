import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const creating = defineScreen({
  title: 'Creating',
  description:
    'The first message created the workspace. It opens at once as Lisbon, on the branch cal/lisbon-7k2q, and joins General. Its sandbox starts from the newest good build of the cloud computer of the org, the chat shows each step of the start, and the message waits until the sandbox is ready.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued',
    banner: 'none',
  },
  useCasePaths: ['user-flows/create-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
