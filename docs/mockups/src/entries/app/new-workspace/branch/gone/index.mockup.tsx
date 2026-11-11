import { defineScreen } from '@mokly/mokly'
import { WorkspaceScreen } from '../../../../../screens/WorkspaceScreen'
import {
  readyWorkspace,
  workspaceStateSchema,
} from '../../../../../screens/workspaceState'

export const branchGone = defineScreen({
  title: 'Branch gone at the start',
  description:
    'Cal sent the first message with the branch calummoore/oslo-3f8k chosen, so the workspace exists in General, on that branch, with the message queued. Before its first start fetched the branch, someone deleted it on GitHub. The bar names the branch that is gone, and says to restore it on GitHub, then try again. Try again stays, and the composer stays under the bar, as after every failed first start.',
  rationale:
    'The plan says that the start fails and names the cause when the chosen branch is gone from GitHub. The rules of a failed first start keep the workspace, its queued messages, and Try again, and Try again starts a new sandbox on the same branch. So the bar adds only the cause and the fix on GitHub. Nothing refuses the create, because no rule checks the branch before the workspace exists. The mockups draw no screen after Try again here, because the branch stays gone until someone restores it.',
  relatedDocs: [],
  propSchema: workspaceStateSchema,
  props: {
    ...readyWorkspace,
    workspace: 'saved-carts-branch',
    sandbox: 'error',
    startError: 'branch-gone',
    conversation: 'queued',
    banner: 'no-commits',
  },
  render: (props, context) => (
    <WorkspaceScreen state={props} viewport={context.viewport} />
  ),
})
