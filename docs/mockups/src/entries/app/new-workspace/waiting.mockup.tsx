import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const waiting = defineScreen({
  title: 'Second message',
  description:
    'The sandbox of the new workspace still starts for the first time. The user writes a second message. The composer keeps it, and Send is off. A short reason beside Send says that the user can send it when the sandbox is ready. The app does not send it on its own. Each session keeps its own message.',
  rationale:
    'The user chose option A of decision 130 on 8 November 2026. A failed first start removes the new workspace, and only the first message goes back to the composer that created it. So the app takes no other message until the first start succeeds. A resume of a stopped workspace still takes messages, which wait for the sandbox, as decision 14 says.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts',
    sandbox: 'starting',
    conversation: 'queued',
    banner: 'no-commits',
    composer: 'draft',
  },
  useCasePaths: ['user-flows/create-workspace'],
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
