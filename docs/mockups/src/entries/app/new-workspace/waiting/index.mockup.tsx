import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../screens/workspaceState'

export const waiting = defineScreen({
  title: 'Second message',
  description:
    'The sandbox of the new workspace still starts for the first time, and the workspace already has its title, Saved carts. The user sends a second message. It waits in the queue under the first one, and each says that it sends when the sandbox is ready. The composer takes more messages from every member.',
  rationale:
    'The user chose option D of decision 130 on 8 November 2026. A failed first start keeps the workspace with its chat and its queue. So the app takes each message during the first start, as it does during a resume (decision 14), and the agent gets the messages in their order when the sandbox is ready.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued-follow-up',
    banner: 'no-commits',
  },
  useCasePaths: ['user-flows/create-workspace', 'user-flows/retry-first-start'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
