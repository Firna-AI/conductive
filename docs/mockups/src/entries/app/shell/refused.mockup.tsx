import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../screens/workspaceState'

export const sandboxRefused = defineScreen({
  title: 'Start refused',
  description:
    'The app refuses to start the sandbox, because Jonas, the owner of the workspace, is suspended. Cal, an active admin, views it. The chat history, the header, and the owner picker stay. The bar in place of the composer shows the words of the refusal and offers no Resume while the owner stays the same.',
  rationale:
    'The operator can suspend an account, as the user chose with option D of decision 28. A suspension stops the cloud computers of the workspaces that the account owns and blocks new starts. One notice shows each refused start with the words of the app. A suspended org uses it too, with its own words, in app/orgs/suspended/workspace. An admin can assign another member as the owner. The refusal then ends, and Resume comes back.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: { ...readyWorkspace, sandbox: 'refused' },

  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'reassign',
      title: 'Assign another owner',
      description:
        'Cal, an active admin, opens the owner picker in the header to assign another member in place of Jonas. With a new owner, the start is no longer refused.',
      props: { overlay: 'reassign' },
    },
  ],
})
